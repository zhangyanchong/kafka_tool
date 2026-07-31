package logic

import (
	"testing"

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
