// Package logic contains read-only Kafka operations and aggregations.
package logic

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/sasl"
	"github.com/twmb/franz-go/pkg/sasl/plain"
	"github.com/twmb/franz-go/pkg/sasl/scram"
	"golang.org/x/crypto/ssh"
)

type OperationError struct {
	StatusCode int
	Err        error
}

func (err *OperationError) Error() string { return err.Err.Error() }

func OpenClient(req model.ConnectionRequest) (*kgo.Client, time.Duration, error) {
	timeout := normalizedTimeout(req.ConnectionTimeoutS)
	options, err := kafkaClientOptions(req, timeout)
	if err != nil {
		return nil, 0, err
	}
	client, err := kgo.NewClient(options...)
	if err != nil {
		return nil, 0, err
	}
	return client, timeout, nil
}

func TestConnection(ctx context.Context, req model.ConnectionRequest) (model.APIResponse, *OperationError) {
	timeout := normalizedTimeout(req.ConnectionTimeoutS)
	options, err := kafkaClientOptions(req, timeout)
	if err != nil {
		return model.APIResponse{}, &OperationError{StatusCode: 400, Err: err}
	}

	started := time.Now()
	client, err := kgo.NewClient(options...)
	if err != nil {
		return model.APIResponse{}, &OperationError{StatusCode: 400, Err: fmt.Errorf("创建 Kafka 客户端失败：%w", err)}
	}
	defer client.Close()

	requestContext, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if err := client.Ping(requestContext); err != nil {
		return model.APIResponse{DurationMS: time.Since(started).Milliseconds()}, &OperationError{
			StatusCode: 502, Err: fmt.Errorf("连接失败：%s", FriendlyKafkaError(err)),
		}
	}
	return connectionMetadata(requestContext, client, started)
}

func kafkaClientOptions(req model.ConnectionRequest, timeout time.Duration) ([]kgo.Opt, error) {
	options := []kgo.Opt{kgo.SeedBrokers(req.Brokers...), kgo.DialTimeout(timeout), kgo.RequestTimeoutOverhead(timeout)}
	if req.SSHEnabled {
		options = append(options, kgo.Dialer(sshProxyDialer(req, timeout)))
	} else if usesTLS(req) {
		options = append(options, kgo.DialTLSConfig(&tls.Config{MinVersion: tls.VersionTLS12, InsecureSkipVerify: req.TLSSkipVerify}))
	}
	if req.SecurityProtocol == "SASL_PLAINTEXT" || req.SecurityProtocol == "SASL_SSL" {
		mechanism, err := saslMechanism(req)
		if err != nil {
			return nil, err
		}
		options = append(options, kgo.SASL(mechanism))
	}
	return options, nil
}

func sshProxyDialer(req model.ConnectionRequest, timeout time.Duration) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		jumpConn, err := (&net.Dialer{Timeout: timeout}).DialContext(ctx, "tcp", req.SSHAddress)
		if err != nil {
			return nil, fmt.Errorf("连接 SSH 跳板机失败：%w", err)
		}

		deadline := time.Now().Add(timeout)
		if contextDeadline, ok := ctx.Deadline(); ok && contextDeadline.Before(deadline) {
			deadline = contextDeadline
		}
		if err := jumpConn.SetDeadline(deadline); err != nil {
			jumpConn.Close()
			return nil, fmt.Errorf("设置 SSH 连接超时失败：%w", err)
		}

		config := &ssh.ClientConfig{
			User:            req.SSHUsername,
			Auth:            []ssh.AuthMethod{ssh.Password(req.SSHPassword)},
			HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 跳板机配置暂未提供 known_hosts。
			Timeout:         timeout,
		}
		clientConn, channels, requests, err := ssh.NewClientConn(jumpConn, req.SSHAddress, config)
		if err != nil {
			jumpConn.Close()
			return nil, fmt.Errorf("SSH 跳板机握手或认证失败：%w", err)
		}
		if err := jumpConn.SetDeadline(time.Time{}); err != nil {
			clientConn.Close()
			return nil, fmt.Errorf("清除 SSH 连接超时失败：%w", err)
		}

		sshClient := ssh.NewClient(clientConn, channels, requests)
		brokerConn, err := sshClient.DialContext(ctx, network, address)
		if err != nil {
			sshClient.Close()
			return nil, fmt.Errorf("通过 SSH 连接 Kafka Broker %s 失败：%w", address, err)
		}
		proxyConn := &sshProxyConn{Conn: brokerConn, client: sshClient}
		if !usesTLS(req) {
			return proxyConn, nil
		}

		tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12, InsecureSkipVerify: req.TLSSkipVerify}
		if host, _, err := net.SplitHostPort(address); err == nil {
			tlsConfig.ServerName = host
		}
		tlsConn := tls.Client(proxyConn, tlsConfig)
		if err := tlsConn.HandshakeContext(ctx); err != nil {
			tlsConn.Close()
			return nil, fmt.Errorf("通过 SSH 建立 Kafka TLS 连接失败：%w", err)
		}
		return tlsConn, nil
	}
}

func usesTLS(req model.ConnectionRequest) bool {
	return req.SecurityProtocol == "SSL" || req.SecurityProtocol == "SASL_SSL"
}

type sshProxyConn struct {
	net.Conn
	client *ssh.Client
	once   sync.Once
}

func (conn *sshProxyConn) Close() error {
	var closeErr error
	conn.once.Do(func() {
		closeErr = conn.Conn.Close()
		if err := conn.client.Close(); closeErr == nil {
			closeErr = err
		}
	})
	return closeErr
}

func normalizedTimeout(seconds int) time.Duration {
	timeout := time.Duration(seconds) * time.Second
	if timeout <= 0 || timeout > 60*time.Second {
		return 10 * time.Second
	}
	return timeout
}

func saslMechanism(req model.ConnectionRequest) (sasl.Mechanism, error) {
	if req.Username == "" {
		return nil, errors.New("使用 SASL 时必须填写用户名")
	}
	switch req.SASLMechanism {
	case "PLAIN", "":
		return plain.Auth{User: req.Username, Pass: req.Password}.AsMechanism(), nil
	case "SCRAM-SHA-256":
		return scram.Auth{User: req.Username, Pass: req.Password}.AsSha256Mechanism(), nil
	case "SCRAM-SHA-512":
		return scram.Auth{User: req.Username, Pass: req.Password}.AsSha512Mechanism(), nil
	default:
		return nil, fmt.Errorf("暂不支持 SASL 机制：%s", req.SASLMechanism)
	}
}

func FriendlyKafkaError(err error) string {
	message := err.Error()
	lowerMessage := strings.ToLower(message)
	if strings.Contains(message, "SSH 跳板机") {
		if strings.Contains(lowerMessage, "unable to authenticate") {
			return "SSH 跳板机认证失败，请检查用户名和密码"
		}
		return message
	}
	if strings.Contains(message, "connection refused") {
		return "Broker 拒绝连接，请检查地址、端口和 Kafka 服务状态"
	}
	if strings.Contains(message, "i/o timeout") || strings.Contains(message, "deadline exceeded") {
		return "连接超时，请检查网络、防火墙和 Broker 地址"
	}
	if strings.Contains(lowerMessage, "sasl") {
		return "SASL 认证失败，请检查认证方式、用户名和密码"
	}
	return message
}
