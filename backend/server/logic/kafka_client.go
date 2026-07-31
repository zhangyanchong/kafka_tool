// Package logic contains read-only Kafka operations and aggregations.
package logic

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"strings"
	"time"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/sasl"
	"github.com/twmb/franz-go/pkg/sasl/plain"
	"github.com/twmb/franz-go/pkg/sasl/scram"
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
	if req.SecurityProtocol == "SSL" || req.SecurityProtocol == "SASL_SSL" {
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
	if strings.Contains(message, "connection refused") {
		return "Broker 拒绝连接，请检查地址、端口和 Kafka 服务状态"
	}
	if strings.Contains(message, "i/o timeout") || strings.Contains(message, "deadline exceeded") {
		return "连接超时，请检查网络、防火墙和 Broker 地址"
	}
	if strings.Contains(strings.ToLower(message), "sasl") {
		return "SASL 认证失败，请检查认证方式、用户名和密码"
	}
	return message
}
