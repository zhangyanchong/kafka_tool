export type SecurityProtocol =
  | "PLAINTEXT"
  | "SSL"
  | "SASL_PLAINTEXT"
  | "SASL_SSL";

export interface ConnectionPayload {
  name: string;
  brokers: string[];
  securityProtocol: SecurityProtocol;
  saslMechanism: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512";
  username: string;
  password: string;
  tlsSkipVerify: boolean;
  connectionTimeoutSeconds: number;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  brokerCount?: number;
  brokers?: string[];
  durationMs?: number;
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`服务返回空响应（HTTP ${response.status}）`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const detail = text.trim().replace(/\s+/g, " ").slice(0, 160);
    throw new Error(
      response.status === 404
        ? "后端接口不存在，请重启最新版本的 Go 服务"
        : `后端返回了非 JSON 数据（HTTP ${response.status}）：${detail}`,
    );
  }
}

export async function testConnection(
  payload: ConnectionPayload,
): Promise<ConnectionResult> {
  const response = await fetch("/api/v1/connections/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readResponse<ConnectionResult>(response);
  if (!response.ok) throw new Error(body.message || "连接测试失败");
  return body;
}

async function postKafka<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readResponse<T & { message?: string }>(response);
  if (!response.ok) throw new Error(body.message || "读取 Kafka 数据失败");
  return body;
}

export interface KafkaTopic {
  name: string;
  partitions: number;
  internal: boolean;
  healthy: boolean;
  problemPartitions: number;
}

export type TopicHealthIssue =
  | "partition_error"
  | "leader_unavailable"
  | "under_replicated"
  | "offline_replicas";

export interface TopicPartitionHealth {
  partition: number;
  leader: number;
  leaderEpoch: number;
  replicas: number[];
  isr: number[];
  offlineReplicas: number[];
  healthy: boolean;
  issues: TopicHealthIssue[];
  errorMessage?: string;
}

export interface TopicHealth {
  topic: string;
  internal: boolean;
  partitions: number;
  healthyPartitions: number;
  problemPartitions: number;
  noLeaderPartitions: number;
  underReplicatedPartitions: number;
  offlineReplicaPartitions: number;
  items: TopicPartitionHealth[];
}

export interface KafkaConsumer {
  groupId: string;
  state: string;
  protocolType: string;
  groupType: string;
}

export interface ConsumerPartition {
  topic: string;
  partition: number;
  logStartOffset: number;
  committedOffset: number;
  logEndOffset: number;
  lag: number;
  hasCommitted: boolean;
  offsetStatus: "normal" | "uncommitted" | "before_start" | "after_end" | "commit_error";
  errorMessage?: string;
}

export interface ConsumerMemberAssignment {
  topic: string;
  partitions: number[];
}

export interface ConsumerMember {
  memberId: string;
  instanceId?: string;
  clientId: string;
  clientHost: string;
  partitionCount: number;
  assignments: ConsumerMemberAssignment[];
}

export interface KafkaMessage {
  partition: number;
  offset: number;
  timestamp: string;
  key: string;
  value: string;
  size: number;
}

export interface MessageSearch {
  fromTime: string;
  toTime: string;
  keyword: string;
  limit: number;
  scanLimit: number;
}

export interface MetricSnapshot {
  timestamp: string;
  topic: string;
  groupId?: string;
  hasConsumer: boolean;
  partitions: number;
  startOffset: number;
  endOffset: number;
  committedOffset: number;
  lag: number;
}

export function listTopics(payload: ConnectionPayload) {
  return postKafka<{ items: KafkaTopic[]; total: number; totalPartitions: number }>(
    "/api/v1/topics/list",
    payload,
  );
}

export function fetchTopicHealth(topic: string, payload: ConnectionPayload) {
  return postKafka<TopicHealth>(
    `/api/v1/topics/${encodeURIComponent(topic)}/health`,
    payload,
  );
}

export function searchTopicMessages(
  topic: string,
  payload: ConnectionPayload,
  search: MessageSearch,
) {
  return postKafka<{
    topic: string;
    items: KafkaMessage[];
    total: number;
    scanned: number;
    truncated: boolean;
  }>(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search`, {
    ...payload,
    ...search,
  });
}

export function listConsumers(payload: ConnectionPayload) {
  return postKafka<{ items: KafkaConsumer[]; total: number }>("/api/v1/consumers/list", payload);
}

export function listConsumerPartitions(groupId: string, payload: ConnectionPayload) {
  return postKafka<{
    groupId: string;
    state?: string;
    protocolType?: string;
    protocol?: string;
    membersAvailable: boolean;
    members: ConsumerMember[];
    items: ConsumerPartition[];
    total: number;
    totalLag: number;
  }>(`/api/v1/consumers/${encodeURIComponent(groupId)}/partitions`, payload);
}

export function fetchMetricSnapshot(
  payload: ConnectionPayload,
  topic: string,
  groupId: string,
) {
  return postKafka<MetricSnapshot>("/api/v1/metrics/snapshot", {
    ...payload,
    topic,
    groupId,
  });
}
