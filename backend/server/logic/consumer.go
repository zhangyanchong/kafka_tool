package logic

import (
	"context"
	"fmt"
	"sort"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/kmsg"
)

func FindConsumers(ctx context.Context, client *kgo.Client) (model.ConsumerListResponse, error) {
	response, err := (&kmsg.ListGroupsRequest{}).RequestWith(ctx, client)
	if err != nil {
		return model.ConsumerListResponse{}, err
	}
	items := make([]model.ConsumerItem, 0, len(response.Groups))
	for _, group := range response.Groups {
		items = append(items, model.ConsumerItem{
			GroupID: group.Group, State: group.GroupState,
			ProtocolType: group.ProtocolType, GroupType: group.GroupType,
		})
	}
	return model.ConsumerListResponse{Items: items, Total: len(items)}, nil
}

func FindConsumerPartitions(ctx context.Context, client *kgo.Client, groupID string) (model.ConsumerPartitionsResponse, error) {
	admin := kadm.NewClient(client)
	committed, err := admin.FetchOffsets(ctx, groupID)
	if err != nil {
		return model.ConsumerPartitionsResponse{}, fmt.Errorf("读取消费组 Offset 失败：%s", FriendlyKafkaError(err))
	}
	topics := make([]string, 0, len(committed))
	for topic := range committed {
		topics = append(topics, topic)
	}
	sort.Strings(topics)
	if len(topics) == 0 {
		return model.ConsumerPartitionsResponse{GroupID: groupID, Items: []model.PartitionItem{}, Total: 0, TotalLag: 0}, nil
	}
	starts, err := admin.ListStartOffsets(ctx, topics...)
	if err != nil {
		return model.ConsumerPartitionsResponse{}, fmt.Errorf("读取分区起始 Offset 失败：%s", FriendlyKafkaError(err))
	}
	ends, err := admin.ListEndOffsets(ctx, topics...)
	if err != nil {
		return model.ConsumerPartitionsResponse{}, fmt.Errorf("读取分区结束 Offset 失败：%s", FriendlyKafkaError(err))
	}

	items := make([]model.PartitionItem, 0)
	var totalLag int64
	for topic, partitions := range committed {
		for partition, commit := range partitions {
			start, startOK := starts.Lookup(topic, partition)
			end, endOK := ends.Lookup(topic, partition)
			if commit.Err != nil || !startOK || !endOK || start.Err != nil || end.Err != nil {
				continue
			}
			hasCommitted := commit.At >= 0
			current := commit.At
			if !hasCommitted {
				current = start.Offset
			}
			lag := end.Offset - current
			if lag < 0 {
				lag = 0
			}
			totalLag += lag
			items = append(items, model.PartitionItem{
				Topic: topic, Partition: partition, LogStartOffset: start.Offset,
				CommittedOffset: commit.At, LogEndOffset: end.Offset, Lag: lag, HasCommitted: hasCommitted,
			})
		}
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Topic == items[j].Topic {
			return items[i].Partition < items[j].Partition
		}
		return items[i].Topic < items[j].Topic
	})
	return model.ConsumerPartitionsResponse{GroupID: groupID, Items: items, Total: len(items), TotalLag: totalLag}, nil
}
