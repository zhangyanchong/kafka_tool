package model

import "testing"

func TestNormalizeMetricSnapshotAllowsTopicOnlyMonitoring(t *testing.T) {
	req := MetricSnapshotRequest{
		ConnectionRequest: ConnectionRequest{Brokers: []string{"localhost:9092"}},
		Topic:             " orders ",
	}

	if err := NormalizeMetricSnapshot(&req); err != nil {
		t.Fatalf("topic-only monitoring was rejected: %v", err)
	}
	if req.Topic != "orders" {
		t.Fatalf("topic = %q, want trimmed topic", req.Topic)
	}
}

func TestNormalizeMetricSnapshotStillRequiresTopic(t *testing.T) {
	req := MetricSnapshotRequest{
		ConnectionRequest: ConnectionRequest{Brokers: []string{"localhost:9092"}},
		GroupID:           "orders-consumer",
	}

	if err := NormalizeMetricSnapshot(&req); err == nil {
		t.Fatal("missing topic was accepted")
	}
}

func TestValidateConnectionRequiresSSHSettingsWhenEnabled(t *testing.T) {
	req := ConnectionRequest{
		Brokers:    []string{"kafka.internal:9092"},
		SSHEnabled: true,
		SSHAddress: "jump.example.com:22",
	}

	if err := ValidateConnection(req); err == nil {
		t.Fatal("incomplete SSH settings were accepted")
	}

	req.SSHUsername = "deploy"
	req.SSHPassword = "secret"
	if err := ValidateConnection(req); err != nil {
		t.Fatalf("valid SSH settings were rejected: %v", err)
	}
}
