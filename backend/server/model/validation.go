package model

import (
	"errors"
	"fmt"
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
