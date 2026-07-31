package logic

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"kafka-tool/backend/server/model"
	"kafka-tool/backend/server/tools"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/kmsg"
)

func FindTopics(ctx context.Context, client *kgo.Client) (model.TopicListResponse, error) {
	metadata, err := (&kmsg.MetadataRequest{}).RequestWith(ctx, client)
	if err != nil {
		return model.TopicListResponse{}, err
	}
	items := make([]model.TopicItem, 0, len(metadata.Topics))
	totalPartitions := 0
	for _, topic := range metadata.Topics {
		if topic.Topic == nil {
			continue
		}
		item := topicItemFromMetadata(topic)
		items = append(items, item)
		totalPartitions += item.Partitions
	}
	return model.TopicListResponse{
		Items: items, Total: len(items), TotalPartitions: totalPartitions,
	}, nil
}

func topicItemFromMetadata(topic kmsg.MetadataResponseTopic) model.TopicItem {
	problemPartitions := 0
	for _, partition := range topic.Partitions {
		underReplicated := len(partition.ISR) < len(partition.Replicas)
		unavailable := partition.ErrorCode != 0 || partition.Leader < 0 || len(partition.OfflineReplicas) > 0
		if unavailable || underReplicated {
			problemPartitions++
		}
	}

	name := ""
	if topic.Topic != nil {
		name = *topic.Topic
	}
	return model.TopicItem{
		Name:              name,
		Partitions:        len(topic.Partitions),
		Internal:          topic.IsInternal,
		Healthy:           topic.ErrorCode == 0 && problemPartitions == 0,
		ProblemPartitions: problemPartitions,
	}
}

func FindTopicHealth(ctx context.Context, client *kgo.Client, topic string) (model.TopicHealthResponse, error) {
	metadata, err := kadm.NewClient(client).Metadata(ctx, topic)
	if err != nil {
		return model.TopicHealthResponse{}, fmt.Errorf("读取 Topic Metadata 失败：%s", FriendlyKafkaError(err))
	}
	detail, ok := metadata.Topics[topic]
	if !ok {
		return model.TopicHealthResponse{}, fmt.Errorf("Kafka 未返回 Topic %s 的 Metadata", topic)
	}
	if detail.Err != nil {
		return model.TopicHealthResponse{}, fmt.Errorf("读取 Topic Metadata 失败：%s", FriendlyKafkaError(detail.Err))
	}

	response := model.TopicHealthResponse{
		Topic:    topic,
		Internal: detail.IsInternal,
		Items:    make([]model.TopicPartitionHealthItem, 0, len(detail.Partitions)),
	}
	for _, partition := range detail.Partitions.Sorted() {
		item := topicPartitionHealthItem(partition)
		response.Items = append(response.Items, item)
		response.Partitions++
		if item.Healthy {
			response.HealthyPartitions++
		} else {
			response.ProblemPartitions++
		}
		if partition.Leader < 0 {
			response.NoLeaderPartitions++
		}
		if len(partition.ISR) < len(partition.Replicas) {
			response.UnderReplicatedPartitions++
		}
		if len(partition.OfflineReplicas) > 0 {
			response.OfflineReplicaPartitions++
		}
	}
	return response, nil
}

func topicPartitionHealthItem(partition kadm.PartitionDetail) model.TopicPartitionHealthItem {
	issues := make([]string, 0, 4)
	errorMessage := ""
	if partition.Err != nil {
		issues = append(issues, "partition_error")
		errorMessage = FriendlyKafkaError(partition.Err)
	}
	if partition.Leader < 0 {
		issues = append(issues, "leader_unavailable")
	}
	if len(partition.ISR) < len(partition.Replicas) {
		issues = append(issues, "under_replicated")
	}
	if len(partition.OfflineReplicas) > 0 {
		issues = append(issues, "offline_replicas")
	}
	return model.TopicPartitionHealthItem{
		Partition:       partition.Partition,
		Leader:          partition.Leader,
		LeaderEpoch:     partition.LeaderEpoch,
		Replicas:        append([]int32{}, partition.Replicas...),
		ISR:             append([]int32{}, partition.ISR...),
		OfflineReplicas: append([]int32{}, partition.OfflineReplicas...),
		Healthy:         len(issues) == 0,
		Issues:          issues,
		ErrorMessage:    errorMessage,
	}
}

func FindMessages(ctx context.Context, client *kgo.Client, topic string, req model.MessageSearchRequest, fromTime, toTime time.Time) (model.MessageSearchResponse, error) {
	admin := kadm.NewClient(client)
	startOffsets, err := admin.ListStartOffsets(ctx, topic)
	if err != nil {
		return model.MessageSearchResponse{}, fmt.Errorf("读取 Topic 起始位置失败：%s", FriendlyKafkaError(err))
	}
	endOffsets, err := admin.ListEndOffsets(ctx, topic)
	if err != nil {
		return model.MessageSearchResponse{}, fmt.Errorf("读取 Topic 结束位置失败：%s", FriendlyKafkaError(err))
	}
	fromOffsets := startOffsets
	if !fromTime.IsZero() {
		fromOffsets, err = admin.ListOffsetsAfterMilli(ctx, fromTime.UnixMilli(), topic)
		if err != nil {
			return model.MessageSearchResponse{}, fmt.Errorf("按开始时间定位 Offset 失败：%s", FriendlyKafkaError(err))
		}
	}
	toOffsets := endOffsets
	if !toTime.IsZero() {
		toOffsets, err = admin.ListOffsetsAfterMilli(ctx, toTime.Add(time.Millisecond).UnixMilli(), topic)
		if err != nil {
			return model.MessageSearchResponse{}, fmt.Errorf("按结束时间定位 Offset 失败：%s", FriendlyKafkaError(err))
		}
	}

	partitionCount := len(endOffsets[topic])
	if partitionCount == 0 {
		return emptyMessageSearchResponse(), nil
	}
	perPartitionWindow := int64(req.Limit)
	if strings.TrimSpace(req.Keyword) != "" {
		perPartitionWindow = tools.MaxInt64(perPartitionWindow, int64((req.ScanLimit+partitionCount-1)/partitionCount))
	}
	assignments := make(map[string]map[int32]kgo.Offset)
	endBounds := make(map[int32]int64)
	for partition, end := range endOffsets[topic] {
		start, ok := fromOffsets.Lookup(topic, partition)
		if !ok || start.Err != nil || end.Err != nil {
			continue
		}
		startAt := start.Offset
		endAt := end.Offset
		if boundedEnd, ok := toOffsets.Lookup(topic, partition); ok && boundedEnd.Err == nil {
			endAt = tools.MinInt64(endAt, boundedEnd.Offset)
		}
		if fromTime.IsZero() && endAt-startAt > perPartitionWindow {
			startAt = endAt - perPartitionWindow
		}
		if startAt >= endAt {
			continue
		}
		if assignments[topic] == nil {
			assignments[topic] = make(map[int32]kgo.Offset)
		}
		assignments[topic][partition] = kgo.NewOffset().At(startAt)
		endBounds[partition] = endAt
	}
	if len(assignments[topic]) == 0 {
		return emptyMessageSearchResponse(), nil
	}
	client.AddConsumePartitions(assignments)

	items, scanned, truncated, err := pollMessages(ctx, client, req, endBounds)
	if err != nil {
		return model.MessageSearchResponse{}, err
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Timestamp > items[j].Timestamp })
	if len(items) > req.Limit {
		items = items[:req.Limit]
	}
	return model.MessageSearchResponse{Topic: topic, Items: items, Total: len(items), Scanned: scanned, Truncated: truncated}, nil
}

func pollMessages(ctx context.Context, client *kgo.Client, req model.MessageSearchRequest, endBounds map[int32]int64) ([]model.MessageItem, int, bool, error) {
	items := make([]model.MessageItem, 0, req.Limit)
	keyword := strings.ToLower(strings.TrimSpace(req.Keyword))
	done := make(map[int32]bool)
	scanned := 0
	for scanned < req.ScanLimit && len(done) < len(endBounds) {
		fetches := client.PollRecords(ctx, tools.MinInt(req.Limit*4, 500))
		if fetches.IsClientClosed() || ctx.Err() != nil {
			break
		}
		if errs := fetches.Errors(); len(errs) > 0 {
			return nil, 0, false, fmt.Errorf("读取消息失败：%s", FriendlyKafkaError(errs[0].Err))
		}
		recordCount := 0
		fetches.EachRecord(func(record *kgo.Record) {
			if scanned >= req.ScanLimit {
				return
			}
			recordCount++
			endAt, tracked := endBounds[record.Partition]
			if !tracked || record.Offset >= endAt {
				done[record.Partition] = true
				return
			}
			scanned++
			if record.Offset+1 >= endAt {
				done[record.Partition] = true
			}
			key := strings.ToValidUTF8(string(record.Key), "�")
			value := strings.ToValidUTF8(string(record.Value), "�")
			if keyword != "" && !strings.Contains(strings.ToLower(key), keyword) && !strings.Contains(strings.ToLower(value), keyword) {
				return
			}
			items = append(items, model.MessageItem{
				Partition: record.Partition, Offset: record.Offset,
				Timestamp: record.Timestamp.Format(time.RFC3339Nano),
				Key:       key, Value: value, Size: len(record.Key) + len(record.Value),
			})
		})
		if recordCount == 0 {
			break
		}
	}
	return items, scanned, scanned >= req.ScanLimit && len(done) < len(endBounds), nil
}

func emptyMessageSearchResponse() model.MessageSearchResponse {
	return model.MessageSearchResponse{Items: []model.MessageItem{}, Total: 0, Scanned: 0, Truncated: false}
}
