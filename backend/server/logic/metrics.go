package logic

import (
	"context"
	"fmt"
	"time"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

func ReadMetricSnapshot(ctx context.Context, client *kgo.Client, req model.MetricSnapshotRequest) (model.MetricSnapshotResponse, error) {
	admin := kadm.NewClient(client)
	starts, err := admin.ListStartOffsets(ctx, req.Topic)
	if err != nil {
		return model.MetricSnapshotResponse{}, fmt.Errorf("读取 Start Offset 失败：%s", FriendlyKafkaError(err))
	}
	ends, err := admin.ListEndOffsets(ctx, req.Topic)
	if err != nil {
		return model.MetricSnapshotResponse{}, fmt.Errorf("读取 End Offset 失败：%s", FriendlyKafkaError(err))
	}
	committed, err := admin.FetchOffsetsForTopics(ctx, req.GroupID, req.Topic)
	if err != nil {
		return model.MetricSnapshotResponse{}, fmt.Errorf("读取消费组 Offset 失败：%s", FriendlyKafkaError(err))
	}

	var startTotal, endTotal, committedTotal, lagTotal int64
	partitionCount := 0
	for partition, end := range ends[req.Topic] {
		if end.Err != nil {
			continue
		}
		startAt := int64(0)
		if start, ok := starts.Lookup(req.Topic, partition); ok && start.Err == nil {
			startAt = start.Offset
		}
		current := startAt
		if commit, ok := committed.Lookup(req.Topic, partition); ok && commit.Err == nil && commit.At >= 0 {
			current = commit.At
		}
		lag := end.Offset - current
		if lag < 0 {
			lag = 0
		}
		startTotal += startAt
		endTotal += end.Offset
		committedTotal += current
		lagTotal += lag
		partitionCount++
	}
	return model.MetricSnapshotResponse{
		Timestamp: time.Now().Format(time.RFC3339Nano), Topic: req.Topic, GroupID: req.GroupID,
		Partitions: partitionCount, StartOffset: startTotal, EndOffset: endTotal,
		CommittedOffset: committedTotal, Lag: lagTotal,
	}, nil
}
