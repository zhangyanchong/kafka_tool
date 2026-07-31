// Package model contains the API request and response contracts.
package model

type ConnectionRequest struct {
	Name               string   `json:"name"`
	Brokers            []string `json:"brokers"`
	SecurityProtocol   string   `json:"securityProtocol"`
	SASLMechanism      string   `json:"saslMechanism"`
	Username           string   `json:"username"`
	Password           string   `json:"password"`
	TLSSkipVerify      bool     `json:"tlsSkipVerify"`
	ConnectionTimeoutS int      `json:"connectionTimeoutSeconds"`
}

type APIResponse struct {
	Success     bool     `json:"success"`
	Message     string   `json:"message"`
	BrokerCount int      `json:"brokerCount,omitempty"`
	Brokers     []string `json:"brokers,omitempty"`
	DurationMS  int64    `json:"durationMs,omitempty"`
}

type MessageSearchRequest struct {
	ConnectionRequest
	FromTime  string `json:"fromTime"`
	ToTime    string `json:"toTime"`
	Keyword   string `json:"keyword"`
	Limit     int    `json:"limit"`
	ScanLimit int    `json:"scanLimit"`
}

type MetricSnapshotRequest struct {
	ConnectionRequest
	Topic   string `json:"topic"`
	GroupID string `json:"groupId"`
}

type TopicItem struct {
	Name              string `json:"name"`
	Partitions        int    `json:"partitions"`
	Internal          bool   `json:"internal"`
	Healthy           bool   `json:"healthy"`
	ProblemPartitions int    `json:"problemPartitions"`
}

type TopicListResponse struct {
	Items           []TopicItem `json:"items"`
	Total           int         `json:"total"`
	TotalPartitions int         `json:"totalPartitions"`
}

type MessageItem struct {
	Partition int32  `json:"partition"`
	Offset    int64  `json:"offset"`
	Timestamp string `json:"timestamp"`
	Key       string `json:"key"`
	Value     string `json:"value"`
	Size      int    `json:"size"`
}

type MessageSearchResponse struct {
	Topic     string        `json:"topic,omitempty"`
	Items     []MessageItem `json:"items"`
	Total     int           `json:"total"`
	Scanned   int           `json:"scanned"`
	Truncated bool          `json:"truncated"`
}

type ConsumerItem struct {
	GroupID      string `json:"groupId"`
	State        string `json:"state"`
	ProtocolType string `json:"protocolType"`
	GroupType    string `json:"groupType"`
}

type ConsumerListResponse struct {
	Items []ConsumerItem `json:"items"`
	Total int            `json:"total"`
}

type PartitionItem struct {
	Topic           string `json:"topic"`
	Partition       int32  `json:"partition"`
	LogStartOffset  int64  `json:"logStartOffset"`
	CommittedOffset int64  `json:"committedOffset"`
	LogEndOffset    int64  `json:"logEndOffset"`
	Lag             int64  `json:"lag"`
	HasCommitted    bool   `json:"hasCommitted"`
}

type ConsumerMemberAssignmentItem struct {
	Topic      string  `json:"topic"`
	Partitions []int32 `json:"partitions"`
}

type ConsumerMemberItem struct {
	MemberID       string                         `json:"memberId"`
	InstanceID     string                         `json:"instanceId,omitempty"`
	ClientID       string                         `json:"clientId"`
	ClientHost     string                         `json:"clientHost"`
	PartitionCount int                            `json:"partitionCount"`
	Assignments    []ConsumerMemberAssignmentItem `json:"assignments"`
}

type ConsumerPartitionsResponse struct {
	GroupID          string               `json:"groupId"`
	State            string               `json:"state,omitempty"`
	ProtocolType     string               `json:"protocolType,omitempty"`
	Protocol         string               `json:"protocol,omitempty"`
	MembersAvailable bool                 `json:"membersAvailable"`
	Members          []ConsumerMemberItem `json:"members"`
	Items            []PartitionItem      `json:"items"`
	Total            int                  `json:"total"`
	TotalLag         int64                `json:"totalLag"`
}

type MetricSnapshotResponse struct {
	Timestamp       string `json:"timestamp"`
	Topic           string `json:"topic"`
	GroupID         string `json:"groupId"`
	Partitions      int    `json:"partitions"`
	StartOffset     int64  `json:"startOffset"`
	EndOffset       int64  `json:"endOffset"`
	CommittedOffset int64  `json:"committedOffset"`
	Lag             int64  `json:"lag"`
}
