package logic

import (
	"errors"
	"reflect"
	"testing"

	"github.com/twmb/franz-go/pkg/kadm"
)

func TestMergeConsumerPartitionSetIncludesCommittedAndAssigned(t *testing.T) {
	committed := kadm.OffsetResponses{
		"orders": {
			0: kadm.OffsetResponse{},
			1: kadm.OffsetResponse{},
		},
	}
	assigned := make(kadm.TopicsSet)
	assigned.Add("orders", 1, 2)
	assigned.Add("payments", 0)

	result := mergeConsumerPartitionSet(committed, assigned)

	for _, partition := range []kadm.Partition{
		{Topic: "orders", Partition: 0},
		{Topic: "orders", Partition: 1},
		{Topic: "orders", Partition: 2},
		{Topic: "payments", Partition: 0},
	} {
		if !result.Lookup(partition.Topic, partition.Partition) {
			t.Fatalf("missing %s partition %d", partition.Topic, partition.Partition)
		}
	}
}

func TestPartitionSetTopicsSortsTopicNames(t *testing.T) {
	partitions := make(kadm.TopicsSet)
	partitions.Add("z-topic", 0)
	partitions.Add("a-topic", 0)

	got := partitionSetTopics(partitions)
	want := []string{"a-topic", "z-topic"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("topics = %v, want %v", got, want)
	}
}

func TestConsumerOffsetStatusDetectsRangeAnomalies(t *testing.T) {
	tests := []struct {
		name   string
		offset int64
		status string
	}{
		{name: "before retained start", offset: 9, status: "before_start"},
		{name: "inside range", offset: 15, status: "normal"},
		{name: "after log end", offset: 21, status: "after_end"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			hasCommitted, status, _ := consumerOffsetStatus(
				kadm.OffsetResponse{Offset: kadm.Offset{At: test.offset}},
				true,
				10,
				20,
			)
			if !hasCommitted {
				t.Fatal("valid committed offset reported as uncommitted")
			}
			if status != test.status {
				t.Fatalf("status = %q, want %q", status, test.status)
			}
		})
	}
}

func TestConsumerOffsetStatusKeepsCommitErrorsDistinctFromUncommitted(t *testing.T) {
	hasCommitted, status, message := consumerOffsetStatus(
		kadm.OffsetResponse{
			Offset: kadm.Offset{At: -1},
			Err:    errors.New("commit lookup failed"),
		},
		true,
		0,
		10,
	)

	if hasCommitted {
		t.Fatal("failed commit lookup reported as committed")
	}
	if status != "commit_error" {
		t.Fatalf("status = %q, want commit_error", status)
	}
	if message == "" {
		t.Fatal("commit lookup error message was not preserved")
	}
}
