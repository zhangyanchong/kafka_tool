package logic

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"kafka-tool/backend/server/model"
	"kafka-tool/backend/server/tools"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kerr"
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
	// A group is associated with a topic when it has committed an offset for it,
	// or when one of its current members is assigned a partition from it. The
	// latter covers newly started groups before their first offset commit.
	if counts, err := topicConsumerGroupCounts(ctx, client); err == nil {
		for index := range items {
			count := counts[items[index].Name]
			items[index].ConsumerGroupCount = &count
		}
	}
	return model.TopicListResponse{
		Items: items, Total: len(items), TotalPartitions: totalPartitions,
	}, nil
}

func topicConsumerGroupCounts(ctx context.Context, client *kgo.Client) (map[string]int, error) {
	groupTopics, err := consumerGroupTopics(ctx, client)
	if err != nil {
		return nil, err
	}
	counts := make(map[string]int)
	for _, topics := range groupTopics {
		for topic := range topics {
			counts[topic]++
		}
	}
	return counts, nil
}

func FindTopicDeletionPlan(ctx context.Context, client *kgo.Client, topic string) (model.TopicDeletionPlanResponse, error) {
	groupTopics, err := consumerGroupTopics(ctx, client)
	if err != nil {
		return model.TopicDeletionPlanResponse{}, err
	}
	plan := model.TopicDeletionPlanResponse{
		Topic:          topic,
		GroupsToDelete: []model.TopicConsumerGroupPlanItem{},
		GroupsKept:     []model.TopicConsumerGroupPlanItem{},
	}
	for groupID, topics := range groupTopics {
		if _, consumesTopic := topics[topic]; !consumesTopic {
			continue
		}
		item := model.TopicConsumerGroupPlanItem{GroupID: groupID, Topics: sortedTopicNames(topics)}
		if len(topics) == 1 {
			plan.GroupsToDelete = append(plan.GroupsToDelete, item)
		} else {
			plan.GroupsKept = append(plan.GroupsKept, item)
		}
	}
	sort.Slice(plan.GroupsToDelete, func(i, j int) bool { return plan.GroupsToDelete[i].GroupID < plan.GroupsToDelete[j].GroupID })
	sort.Slice(plan.GroupsKept, func(i, j int) bool { return plan.GroupsKept[i].GroupID < plan.GroupsKept[j].GroupID })
	return plan, nil
}

func DeleteTopicAndConsumerGroups(ctx context.Context, client *kgo.Client, topic string) (model.TopicDeletionResponse, error) {
	plan, err := FindTopicDeletionPlan(ctx, client, topic)
	if err != nil {
		return model.TopicDeletionResponse{}, err
	}
	if _, err := kadm.NewClient(client).DeleteTopic(ctx, topic); err != nil {
		return model.TopicDeletionResponse{}, err
	}
	response := model.TopicDeletionResponse{
		Success: true, Message: "Topic 已提交删除请求",
		DeletedGroups: []string{}, GroupsKept: plan.GroupsKept, FailedGroupDeletions: []string{},
	}
	for _, group := range plan.GroupsToDelete {
		if err := DeleteConsumer(ctx, client, group.GroupID); err != nil {
			response.FailedGroupDeletions = append(response.FailedGroupDeletions, group.GroupID)
			continue
		}
		response.DeletedGroups = append(response.DeletedGroups, group.GroupID)
	}
	if len(response.FailedGroupDeletions) > 0 {
		response.Message = "Topic 已提交删除请求，但部分消费组未删除"
	}
	return response, nil
}

func RecreateTopicAndConsumerGroups(ctx context.Context, client *kgo.Client, topic string) (model.TopicRecreationResponse, error) {
	partitions, replicationFactor, err := topicLayout(ctx, client, topic)
	if err != nil {
		return model.TopicRecreationResponse{}, err
	}
	deleted, err := DeleteTopicAndConsumerGroups(ctx, client, topic)
	if err != nil {
		return model.TopicRecreationResponse{}, err
	}
	if err := waitForTopicDeletion(ctx, client, topic); err != nil {
		return model.TopicRecreationResponse{}, fmt.Errorf("Topic 删除尚未完成，未重建：%w", err)
	}
	if _, err := kadm.NewClient(client).CreateTopic(ctx, partitions, replicationFactor, nil, topic); err != nil {
		return model.TopicRecreationResponse{}, fmt.Errorf("Topic 已删除，但重建失败：%w", err)
	}
	if err := waitForTopicReady(ctx, client, topic, partitions); err != nil {
		return model.TopicRecreationResponse{}, fmt.Errorf("Topic 已创建，但分区尚未就绪：%w", err)
	}
	message := "Topic 已按原分区数和副本数重建"
	if len(deleted.FailedGroupDeletions) > 0 {
		message += "；部分消费组未删除"
	}
	return model.TopicRecreationResponse{
		Success: true, Message: message, Partitions: partitions, ReplicationFactor: replicationFactor,
		DeletedGroups: deleted.DeletedGroups, FailedGroupDeletions: deleted.FailedGroupDeletions,
	}, nil
}

func topicLayout(ctx context.Context, client *kgo.Client, topic string) (int32, int16, error) {
	metadata, err := kadm.NewClient(client).Metadata(ctx, topic)
	if err != nil {
		return 0, 0, err
	}
	detail, ok := metadata.Topics[topic]
	if !ok || detail.Err != nil {
		return 0, 0, fmt.Errorf("读取 Topic 配置失败")
	}
	if detail.IsInternal {
		return 0, 0, fmt.Errorf("Kafka 内部 Topic 不允许重建")
	}
	partitions := int32(len(detail.Partitions))
	replicationFactor := int16(detail.Partitions.NumReplicas())
	if partitions == 0 || replicationFactor == 0 {
		return 0, 0, fmt.Errorf("Topic 分区或副本数无效")
	}
	return partitions, replicationFactor, nil
}

func waitForTopicDeletion(ctx context.Context, client *kgo.Client, topic string) error {
	admin := kadm.NewClient(client)
	for {
		metadata, err := admin.Metadata(ctx, topic)
		if err != nil {
			return err
		}
		detail, exists := metadata.Topics[topic]
		if !exists || errors.Is(detail.Err, kerr.UnknownTopicOrPartition) {
			return nil
		}
		if detail.Err != nil {
			return detail.Err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(250 * time.Millisecond):
		}
	}
}

func waitForTopicReady(ctx context.Context, client *kgo.Client, topic string, expectedPartitions int32) error {
	admin := kadm.NewClient(client)
	for {
		metadata, err := admin.Metadata(ctx, topic)
		if err != nil {
			return err
		}
		detail, exists := metadata.Topics[topic]
		ready := exists && detail.Err == nil && int32(len(detail.Partitions)) == expectedPartitions
		if ready {
			for _, partition := range detail.Partitions {
				if partition.Leader < 0 {
					ready = false
					break
				}
			}
		}
		if ready {
			return nil
		}
		if exists && detail.Err != nil && !errors.Is(detail.Err, kerr.UnknownTopicOrPartition) {
			return detail.Err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(250 * time.Millisecond):
		}
	}
}

func consumerGroupTopics(ctx context.Context, client *kgo.Client) (map[string]map[string]struct{}, error) {
	admin := kadm.NewClient(client)
	listed, err := admin.ListGroups(ctx)
	if err != nil {
		return nil, err
	}
	groupIDs := listed.Groups()
	result := make(map[string]map[string]struct{})
	add := func(groupID, topic string) {
		if result[groupID] == nil {
			result[groupID] = make(map[string]struct{})
		}
		result[groupID][topic] = struct{}{}
	}
	if len(groupIDs) == 0 {
		return result, nil
	}

	// FetchManyOffsets batches requests by coordinator, avoiding one request per
	// group when the topic table is opened.
	fetched := admin.FetchManyOffsets(ctx, groupIDs...)
	if err := fetched.Error(); err != nil {
		return nil, err
	}
	for groupID, response := range fetched {
		for topic, partitions := range response.Fetched {
			if len(partitions) > 0 {
				add(groupID, topic)
			}
		}
	}

	described, err := admin.DescribeGroups(ctx, groupIDs...)
	if err != nil {
		return nil, err
	}
	for groupID, group := range described {
		if group.Err != nil {
			continue
		}
		group.AssignedPartitions().Each(func(topic string, _ int32) {
			add(groupID, topic)
		})
	}
	return result, nil
}

func sortedTopicNames(topics map[string]struct{}) []string {
	result := make([]string, 0, len(topics))
	for topic := range topics {
		result = append(result, topic)
	}
	sort.Strings(result)
	return result
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

func ProduceTopicMessage(ctx context.Context, client *kgo.Client, topic string, key string, value string) (model.ProducedMessageResponse, error) {
	record, err := client.ProduceSync(ctx, &kgo.Record{
		Topic: topic, Key: []byte(key), Value: []byte(value),
	}).First()
	if err != nil {
		return model.ProducedMessageResponse{}, err
	}
	return model.ProducedMessageResponse{
		Partition: record.Partition,
		Offset:    record.Offset,
		Timestamp: record.Timestamp.Format(time.RFC3339Nano),
	}, nil
}

func CreateTopic(ctx context.Context, client *kgo.Client, topic string, partitions int32, replicationFactor int16) (model.CreateTopicResponse, error) {
	if err := validateNewTopicName(topic); err != nil {
		return model.CreateTopicResponse{}, err
	}
	requestedReplicationFactor := replicationFactor
	if requestedReplicationFactor == 0 {
		requestedReplicationFactor = -1 // Kafka 2.4+ uses the broker default when this is -1.
	}
	if _, err := kadm.NewClient(client).CreateTopic(ctx, partitions, requestedReplicationFactor, nil, topic); err != nil {
		return model.CreateTopicResponse{}, err
	}
	if err := waitForTopicReady(ctx, client, topic, partitions); err != nil {
		return model.CreateTopicResponse{}, fmt.Errorf("Topic 已创建，但分区尚未就绪：%w", err)
	}
	_, actualReplicationFactor, err := topicLayout(ctx, client, topic)
	if err != nil {
		return model.CreateTopicResponse{}, fmt.Errorf("Topic 已创建，但无法读取副本数：%w", err)
	}
	return model.CreateTopicResponse{
		Success: true, Message: "Topic 已创建", Partitions: partitions, ReplicationFactor: actualReplicationFactor,
	}, nil
}

func validateNewTopicName(topic string) error {
	if topic == "" || len(topic) > 249 {
		return fmt.Errorf("Topic 名称长度必须在 1 到 249 个字符之间")
	}
	if topic == "." || topic == ".." {
		return fmt.Errorf("Topic 名称不能为 . 或 ..")
	}
	for _, character := range topic {
		if (character < 'a' || character > 'z') && (character < 'A' || character > 'Z') &&
			(character < '0' || character > '9') && character != '.' && character != '_' && character != '-' {
			return fmt.Errorf("Topic 名称只能包含字母、数字、点、下划线和连字符")
		}
	}
	return nil
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
	estimatedMessages := estimatedTopicMessages(topic, startOffsets, endOffsets)
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
		return emptyMessageSearchResponse(estimatedMessages), nil
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
		return emptyMessageSearchResponse(estimatedMessages), nil
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
	return model.MessageSearchResponse{
		Topic: topic, Items: items, Total: len(items), Scanned: scanned, Truncated: truncated,
		EstimatedMessages: estimatedMessages,
	}, nil
}

func estimatedTopicMessages(topic string, startOffsets, endOffsets kadm.ListedOffsets) *int64 {
	starts := startOffsets[topic]
	ends := endOffsets[topic]
	if len(starts) == 0 || len(starts) != len(ends) {
		return nil
	}
	var total int64
	for partition, start := range starts {
		end, ok := ends[partition]
		if !ok || start.Err != nil || end.Err != nil || start.Offset < 0 || end.Offset < start.Offset {
			return nil
		}
		total += end.Offset - start.Offset
	}
	return &total
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

func emptyMessageSearchResponse(estimatedMessages *int64) model.MessageSearchResponse {
	return model.MessageSearchResponse{
		Items: []model.MessageItem{}, Total: 0, Scanned: 0, Truncated: false,
		EstimatedMessages: estimatedMessages,
	}
}
