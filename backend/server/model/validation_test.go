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
