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

	response := model.ConsumerPartitionsResponse{
		GroupID: groupID,
		Members: []model.ConsumerMemberItem{},
		Items:   []model.PartitionItem{},
	}
	assigned := make(kadm.TopicsSet)
	described, describeErr := admin.DescribeGroups(ctx, groupID)
	if describedGroup, ok := described[groupID]; describeErr == nil && ok && describedGroup.Err == nil {
		response.State = describedGroup.State
		response.ProtocolType = describedGroup.ProtocolType
		response.Protocol = describedGroup.Protocol
		response.MembersAvailable = true
		response.Members = consumerMembersFromDescription(describedGroup)
		assigned = describedGroup.AssignedPartitions()
	}

	committed, err := admin.FetchOffsets(ctx, groupID)
	if err != nil {
		return model.ConsumerPartitionsResponse{}, fmt.Errorf("读取消费组 Offset 失败：%s", FriendlyKafkaError(err))
	}

	partitionSet := mergeConsumerPartitionSet(committed, assigned)
	topics := partitionSetTopics(partitionSet)
	if len(topics) == 0 {
		return response, nil
	}
	starts, err := admin.ListStartOffsets(ctx, topics...)
	if err != nil {
		return model.ConsumerPartitionsResponse{}, fmt.Errorf("读取分区起始 Offset 失败：%s", FriendlyKafkaError(err))
	}
	ends, err := admin.ListEndOffsets(ctx, topics...)
	if err != nil {
		return model.ConsumerPartitionsResponse{}, fmt.Errorf("读取分区结束 Offset 失败：%s", FriendlyKafkaError(err))
	}

	partitionSet.Each(func(topic string, partition int32) {
		commit, commitOK := committed.Lookup(topic, partition)
		start, startOK := starts.Lookup(topic, partition)
		end, endOK := ends.Lookup(topic, partition)
		if !startOK || !endOK || start.Err != nil || end.Err != nil {
			return
		}
		hasCommitted, offsetStatus, errorMessage := consumerOffsetStatus(
			commit, commitOK, start.Offset, end.Offset,
		)
		committedOffset := int64(-1)
		current := start.Offset
		if hasCommitted {
			committedOffset = commit.At
			current = commit.At
		}
		lag := end.Offset - current
		if lag < 0 {
			lag = 0
		}
		response.TotalLag += lag
		response.Items = append(response.Items, model.PartitionItem{
			Topic: topic, Partition: partition, LogStartOffset: start.Offset,
			CommittedOffset: committedOffset, LogEndOffset: end.Offset, Lag: lag, HasCommitted: hasCommitted,
			OffsetStatus: offsetStatus, ErrorMessage: errorMessage,
		})
	})
	sort.Slice(response.Items, func(i, j int) bool {
		if response.Items[i].Topic == response.Items[j].Topic {
			return response.Items[i].Partition < response.Items[j].Partition
		}
		return response.Items[i].Topic < response.Items[j].Topic
	})
	response.Total = len(response.Items)
	return response, nil
}

func consumerOffsetStatus(commit kadm.OffsetResponse, exists bool, start, end int64) (bool, string, string) {
	if !exists {
		return false, "uncommitted", ""
	}
	if commit.Err != nil {
		return false, "commit_error", FriendlyKafkaError(commit.Err)
	}
	if commit.At < 0 {
		return false, "uncommitted", ""
	}
	switch {
	case commit.At < start:
		return true, "before_start", ""
	case commit.At > end:
		return true, "after_end", ""
	default:
		return true, "normal", ""
	}
}

func mergeConsumerPartitionSet(committed kadm.OffsetResponses, assigned kadm.TopicsSet) kadm.TopicsSet {
	result := make(kadm.TopicsSet)
	for topic, partitions := range committed {
		for partition := range partitions {
			result.Add(topic, partition)
		}
	}
	assigned.Each(func(topic string, partition int32) {
		result.Add(topic, partition)
	})
	return result
}

func partitionSetTopics(partitions kadm.TopicsSet) []string {
	topics := make([]string, 0, len(partitions))
	for topic := range partitions {
		topics = append(topics, topic)
	}
	sort.Strings(topics)
	return topics
}

func consumerMembersFromDescription(group kadm.DescribedGroup) []model.ConsumerMemberItem {
	members := make([]model.ConsumerMemberItem, 0, len(group.Members))
	for _, member := range group.Members {
		item := model.ConsumerMemberItem{
			MemberID:    member.MemberID,
			ClientID:    member.ClientID,
			ClientHost:  member.ClientHost,
			Assignments: []model.ConsumerMemberAssignmentItem{},
		}
		if member.InstanceID != nil {
			item.InstanceID = *member.InstanceID
		}
		if assignment, ok := member.Assigned.AsConsumer(); ok {
			for _, topic := range assignment.Topics {
				partitions := append([]int32(nil), topic.Partitions...)
				sort.Slice(partitions, func(i, j int) bool { return partitions[i] < partitions[j] })
				item.PartitionCount += len(partitions)
				item.Assignments = append(item.Assignments, model.ConsumerMemberAssignmentItem{
					Topic: topic.Topic, Partitions: partitions,
				})
			}
			sort.Slice(item.Assignments, func(i, j int) bool {
				return item.Assignments[i].Topic < item.Assignments[j].Topic
			})
		}
		members = append(members, item)
	}
	return members
}
