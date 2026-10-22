package logic

import (
	"errors"
	"strings"
	"testing"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/kmsg"
)

func TestCompactMessageItemsOnlyOmitsLargeValues(t *testing.T) {
	items := []model.MessageItem{
		{Value: "small"},
		{Value: strings.Repeat("x", compactMessageThreshold+1)},
	}

	compactMessageItems(items)

	if items[0].Value != "small" || items[0].ValueOmitted {
		t.Fatal("small message was unexpectedly compacted")
	}
	if !items[1].ValueOmitted || items[1].Value != "" {
		t.Fatal("large message content was not omitted")
	}
	if len(items[1].Preview) != compactMessagePreviewBytes {
		t.Fatalf("preview length = %d, want %d", len(items[1].Preview), compactMessagePreviewBytes)
	}
}

func TestSortMessageItemsByTimeDescUsesActualTimestamp(t *testing.T) {
	items := []model.MessageItem{
		{Partition: 0, Offset: 1, Timestamp: "2026-09-24T14:39:42Z"},
		{Partition: 0, Offset: 2, Timestamp: "2026-09-24T14:39:42.9Z"},
		{Partition: 1, Offset: 3, Timestamp: "2026-09-24T14:39:43Z"},
	}

	sortMessageItemsByTimeDesc(items)

	want := []int64{3, 2, 1}
	for index, offset := range want {
		if items[index].Offset != offset {
			t.Fatalf("items[%d].Offset = %d, want %d", index, items[index].Offset, offset)
		}
	}
}

func TestTailScanQuotaDistributesTheTotalScanLimit(t *testing.T) {
	var total int
	for index := range 10 {
		quota := tailScanQuota(10000, 10, index)
		if quota != 1000 {
			t.Fatalf("partition %d quota = %d, want 1000", index, quota)
		}
		total += quota
	}
	if total != 10000 {
		t.Fatalf("total quota = %d, want 10000", total)
	}
}

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

func TestEstimatedTopicMessagesSumsPartitionOffsetRanges(t *testing.T) {
	startOffsets := kadm.ListedOffsets{"orders": {
		0: {Topic: "orders", Partition: 0, Offset: 10},
		1: {Topic: "orders", Partition: 1, Offset: 5},
	}}
	endOffsets := kadm.ListedOffsets{"orders": {
		0: {Topic: "orders", Partition: 0, Offset: 40},
		1: {Topic: "orders", Partition: 1, Offset: 35},
	}}

	estimated := estimatedTopicMessages("orders", startOffsets, endOffsets)
	if estimated == nil || *estimated != 60 {
		t.Fatalf("estimated messages = %v, want 60", estimated)
	}
}

func TestEstimatedTopicMessagesIsUnavailableForPartialOffsets(t *testing.T) {
	startOffsets := kadm.ListedOffsets{"orders": {
		0: {Topic: "orders", Partition: 0, Offset: 10},
	}}
	endOffsets := kadm.ListedOffsets{"orders": {
		0: {Topic: "orders", Partition: 0, Offset: 40},
		1: {Topic: "orders", Partition: 1, Offset: 35},
	}}

	if estimated := estimatedTopicMessages("orders", startOffsets, endOffsets); estimated != nil {
		t.Fatalf("estimated messages = %d, want unavailable", *estimated)
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

func TestMessageHeadersPreserveOrderAndValues(t *testing.T) {
	record := &kgo.Record{Key: []byte("key"), Value: []byte("body"), Headers: []kgo.RecordHeader{
		{Key: "trace", Value: []byte("中文\nvalue")},
		{Key: "trace", Value: []byte("")},
		{Key: "null", Value: nil},
		{Key: "binary", Value: []byte{0xff}},
		{Key: "control", Value: []byte{0}},
	}}
	item := messageItemFromRecord(record)
	if len(item.Headers) != 5 {
		t.Fatalf("headers = %v", item.Headers)
	}
	if item.Headers[0].Key != "trace" || item.Headers[0].Value != "中文\nvalue" || item.Headers[0].Binary {
		t.Fatal("text header changed")
	}
	if item.Headers[1].Key != "trace" || item.Headers[1].Null || item.Headers[1].Value != "" {
		t.Fatal("duplicate or empty header changed")
	}
	if !item.Headers[2].Null {
		t.Fatal("null header lost")
	}
	for _, header := range item.Headers[3:] {
		if !header.Binary || header.Value != "" {
			t.Fatal("binary header should be labeled without text conversion")
		}
	}
	if item.Key != "key" || item.Value != "body" || item.Size != 7 {
		t.Fatal("existing message fields changed")
	}
	compactMessageItems([]model.MessageItem{item})
	if len(messageItemFromRecord(&kgo.Record{}).Headers) != 0 {
		t.Fatal("expected no headers")
	}
}
