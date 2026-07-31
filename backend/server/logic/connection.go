package logic

import (
	"context"
	"fmt"
	"time"

	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/kmsg"
)

func connectionMetadata(ctx context.Context, client *kgo.Client, started time.Time) (model.APIResponse, *OperationError) {
	metadata, err := (&kmsg.MetadataRequest{}).RequestWith(ctx, client)
	if err != nil {
		return model.APIResponse{}, &OperationError{StatusCode: 502, Err: fmt.Errorf("已连通，但读取集群信息失败：%s", err)}
	}
	brokers := make([]string, 0, len(metadata.Brokers))
	for _, broker := range metadata.Brokers {
		brokers = append(brokers, fmt.Sprintf("%s:%d", broker.Host, broker.Port))
	}
	return model.APIResponse{
		Success: true, Message: "连接成功", BrokerCount: len(brokers), Brokers: brokers,
		DurationMS: time.Since(started).Milliseconds(),
	}, nil
}
