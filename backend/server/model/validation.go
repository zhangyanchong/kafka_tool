package model

import (
	"errors"
	"fmt"
	"net"
	"strings"
	"time"
)

func ValidateConnection(req ConnectionRequest) error {
	if len(req.Brokers) == 0 {
		return errors.New("请至少填写一个 Broker 地址")
	}
	for _, broker := range req.Brokers {
		if !strings.Contains(broker, ":") {
			return fmt.Errorf("Broker 地址需要包含端口：%s", broker)
		}
	}
	if req.SSHEnabled {
		if _, _, err := net.SplitHostPort(req.SSHAddress); err != nil {
			return errors.New("SSH 跳板机地址格式不正确，请填写 host:port")
		}
		if strings.TrimSpace(req.SSHUsername) == "" {
			return errors.New("使用 SSH 跳板机时必须填写用户名")
		}
		if req.SSHPassword == "" {
			return errors.New("使用 SSH 跳板机时必须填写密码")
		}
	}
	return nil
}

func NormalizeMessageSearch(req *MessageSearchRequest) (time.Time, time.Time, error) {
	if err := ValidateConnection(req.ConnectionRequest); err != nil {
		return time.Time{}, time.Time{}, err
	}
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Limit < 1 || req.Limit > 10000 {
		return time.Time{}, time.Time{}, errors.New("返回数量必须在 1 到 10,000 之间")
	}
	if req.ScanLimit == 0 {
		req.ScanLimit = 10000
	}
	if req.ScanLimit < 1 || req.ScanLimit > 1000000 {
		return time.Time{}, time.Time{}, errors.New("最大查询条数必须在 1 到 1,000,000 之间")
	}
	conditions := make([]MessageSearchCondition, 0, len(req.Conditions))
	for _, condition := range req.Conditions {
		condition.Field = strings.TrimSpace(condition.Field)
		condition.Value = strings.TrimSpace(condition.Value)
		if condition.Value == "" {
			continue
		}
		if condition.Field == "" {
			condition.Field = "any"
		}
		if condition.Field != "any" && condition.Field != "key" && condition.Field != "value" {
			return time.Time{}, time.Time{}, errors.New("检索位置只能是消息内容、Key 或两者")
		}
		conditions = append(conditions, condition)
	}
	req.Conditions = conditions
	fromTime, err := ParseOptionalTime(req.FromTime)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("开始时间格式不正确")
	}
	toTime, err := ParseOptionalTime(req.ToTime)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("结束时间格式不正确")
	}
	if !fromTime.IsZero() && !toTime.IsZero() && fromTime.After(toTime) {
		return time.Time{}, time.Time{}, errors.New("开始时间不能晚于结束时间")
	}
	return fromTime, toTime, nil
}

func NormalizeProduceMessage(req *ProduceMessageRequest) error {
	if err := ValidateConnection(req.ConnectionRequest); err != nil {
		return err
	}
	if strings.TrimSpace(req.Value) == "" {
		return errors.New("消息内容不能为空")
	}
	return nil
}

func NormalizeCreateTopic(req *CreateTopicRequest) error {
	if err := ValidateConnection(req.ConnectionRequest); err != nil {
		return err
	}
	if req.Partitions < 1 || req.Partitions > 100000 {
		return errors.New("分区数必须在 1 到 100,000 之间")
	}
	if req.ReplicationFactor < 0 || req.ReplicationFactor > 32767 {
		return errors.New("副本数必须在 1 到 32,767 之间，或留空使用集群默认值")
	}
	return nil
}

func NormalizeMetricSnapshot(req *MetricSnapshotRequest) error {
	if err := ValidateConnection(req.ConnectionRequest); err != nil {
		return err
	}
	req.Topic = strings.TrimSpace(req.Topic)
	req.GroupID = strings.TrimSpace(req.GroupID)
	if req.Topic == "" {
		return errors.New("请选择 Topic")
	}
	return nil
}

func ParseOptionalTime(value string) (time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return time.Time{}, nil
	}
	return time.Parse(time.RFC3339, value)
}
