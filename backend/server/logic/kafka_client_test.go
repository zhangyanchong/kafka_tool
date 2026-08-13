package logic

import (
	"testing"
	"time"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kgo"
)

func TestKafkaClientOptionsSupportSSHTLS(t *testing.T) {
	req := model.ConnectionRequest{
		Brokers:          []string{"kafka.internal:9093"},
		SecurityProtocol: "SSL",
		SSHEnabled:       true,
		SSHAddress:       "jump.example.com:22",
		SSHUsername:      "deploy",
		SSHPassword:      "secret",
	}

	options, err := kafkaClientOptions(req, 10*time.Second)
	if err != nil {
		t.Fatalf("building SSH + TLS options failed: %v", err)
	}
	client, err := kgo.NewClient(options...)
	if err != nil {
		t.Fatalf("SSH + TLS options are incompatible: %v", err)
	}
	client.Close()
}
