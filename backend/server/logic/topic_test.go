package logic

import (
	"errors"
	"testing"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kmsg"
)

func TestTopicItemFromMetadataReportsHealthyTopic(t *testing.T) {
	name := "orders"
	item := topicItemFromMetadata(kmsg.MetadataResponseTopic{
		Topic: &name,
		Partitions: []kmsg.MetadataResponseTopicPartition{
			{Partition: 0, Leader: 1, Replicas: []int32{1, 2}, ISR: []int32{1, 2}},
			{Partition: 1, Leader: 2, Replicas: []int32{1, 2}, ISR: []int32{1, 2}},
		},
	})

	if !item.Healthy {
		t.Fatal("healthy metadata was reported as unhealthy")
	}
	if item.ProblemPartitions != 0 {
		t.Fatalf("problem partitions = %d, want 0", item.ProblemPartitions)
	}
}

func TestTopicItemFromMetadataCountsEachProblemPartitionOnce(t *testing.T) {
	name := "payments"
	item := topicItemFromMetadata(kmsg.MetadataResponseTopic{
		Topic: &name,
		Partitions: []kmsg.MetadataResponseTopicPartition{
			{
				Partition:       0,
				Leader:          -1,
				Replicas:        []int32{1, 2, 3},
				ISR:             []int32{1},
				OfflineReplicas: []int32{2, 3},
			},
			{Partition: 1, Leader: 1, Replicas: []int32{1, 2}, ISR: []int32{1}},
			{Partition: 2, Leader: 2, Replicas: []int32{1, 2}, ISR: []int32{1, 2}},
		},
	})

	if item.Healthy {
		t.Fatal("unhealthy metadata was reported as healthy")
	}
	if item.ProblemPartitions != 2 {
		t.Fatalf("problem partitions = %d, want 2", item.ProblemPartitions)
	}
}

func TestTopicPartitionHealthItemReportsHealthyPartition(t *testing.T) {
	item := topicPartitionHealthItem(kadm.PartitionDetail{
		Partition: 3,
		Leader:    1,
		Replicas:  []int32{1, 2, 3},
		ISR:       []int32{1, 2, 3},
	})

	if !item.Healthy {
		t.Fatalf("healthy partition reported issues: %v", item.Issues)
	}
	if len(item.Issues) != 0 {
		t.Fatalf("issues = %v, want none", item.Issues)
	}
}

func TestTopicPartitionHealthItemReportsAllProblems(t *testing.T) {
	item := topicPartitionHealthItem(kadm.PartitionDetail{
		Partition:       7,
		Leader:          -1,
		Replicas:        []int32{1, 2, 3},
		ISR:             []int32{1},
		OfflineReplicas: []int32{2, 3},
		Err:             errors.New("metadata unavailable"),
	})

	if item.Healthy {
		t.Fatal("problem partition reported as healthy")
	}
	if len(item.Issues) != 4 {
		t.Fatalf("issues = %v, want 4 problem types", item.Issues)
	}
	if item.ErrorMessage == "" {
		t.Fatal("partition error message was not preserved")
	}
}
