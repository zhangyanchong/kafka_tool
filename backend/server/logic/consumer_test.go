package logic

import (
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
