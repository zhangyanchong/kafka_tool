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
  sshEnabled: boolean;
  sshAddress: string;
  sshUsername: string;
  sshPassword: string;
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
    const detail = text.trim();
    throw new Error(
      response.status === 404
        ? "后端接口不存在，请重启最新版本的 Go 服务"
        : `后端返回了非 JSON 数据（HTTP ${response.status}）：${detail}`,
    );
  }
}

interface DesktopAPI {
  Request: (method: string, path: string, body: string) => Promise<{ status: number; body: string }>;
}

async function requestDesktop(api: DesktopAPI, path: string, init?: RequestInit): Promise<Response> {
  const signal = init?.signal;
  signal?.throwIfAborted();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    if (signal) {
      onAbort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
  try {
    const result = await Promise.race([
      api.Request(init?.method ?? "GET", path, String(init?.body ?? "")),
      aborted,
    ]);
    return new Response(result.body, {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

// Keep transport failures distinct from Kafka errors returned by the backend.
async function fetchBackend(path: string, init?: RequestInit): Promise<Response> {
  try {
    const api = typeof window === "undefined" ? undefined :
      (window as unknown as { go?: { main?: { APIBridge?: DesktopAPI } } }).go?.main?.APIBridge;
    return api ? await requestDesktop(api, path, init) : await fetch(path, init);
  } catch (reason) {
    if (init?.signal?.aborted || (reason instanceof Error && reason.name === "AbortError")) {
      throw reason;
    }
    const detail = reason instanceof Error ? reason.message : String(reason);
    throw new Error(
      `界面未能获取程序后端的响应，暂时无法确认 Kafka 连接结果。` +
      `请通过 bash launch.sh 启动并重试，查看终端及启动日志。` +
      `接口：${path}；原始错误：${detail}`,
    );
  }
}

export async function testConnection(
  payload: ConnectionPayload,
): Promise<ConnectionResult> {
  const response = await fetchBackend("/api/v1/connections/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readResponse<ConnectionResult>(response);
  if (!response.ok) throw new Error(`${body.message || "连接测试失败"}\nHTTP 状态：${response.status}\n后端响应：${JSON.stringify(body, null, 2)}`);
  return body;
}

async function postKafka<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetchBackend(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await readResponse<T & { message?: string }>(response);
  if (!response.ok) throw new Error(body.message || "读取 Kafka 数据失败");
  return body;
}

export interface KafkaTopic {
  name: string;
  partitions: number;
  consumerGroupCount?: number;
  internal: boolean;
  healthy: boolean;
  problemPartitions: number;
}

export interface TopicConsumerGroupPlanItem {
  groupId: string;
  topics: string[];
}

export interface TopicDeletionPlan {
  topic: string;
  groupsToDelete: TopicConsumerGroupPlanItem[];
  groupsKept: TopicConsumerGroupPlanItem[];
}

export interface TopicDeletionResult {
  success: boolean;
  message: string;
  deletedGroups: string[];
  groupsKept: TopicConsumerGroupPlanItem[];
  failedGroupDeletions?: string[];
}

export interface TopicRecreationResult {
  success: boolean;
  message: string;
  partitions: number;
  replicationFactor: number;
  deletedGroups: string[];
  failedGroupDeletions?: string[];
}

export interface CreatedTopicResult {
  success: boolean;
  message: string;
  partitions: number;
  replicationFactor: number;
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
  preview?: string;
  valueOmitted?: boolean;
}

export interface ProducedMessage {
  partition: number;
  offset: number;
  timestamp: string;
}

export interface MessageSearch {
  fromTime: string;
  toTime: string;
  keyword?: string;
  conditions?: MessageSearchCondition[];
  matchAny?: boolean;
  limit: number;
  scanLimit: number;
  compactResults?: boolean;
}

export interface MessageSearchCondition {
  field: "value" | "key" | "any";
  value: string;
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

export function fetchTopicDeletionPlan(topic: string, payload: ConnectionPayload) {
  return postKafka<TopicDeletionPlan>(
    `/api/v1/topics/${encodeURIComponent(topic)}/deletion-plan`,
    payload,
  );
}

export function deleteTopic(topic: string, payload: ConnectionPayload) {
  return postKafka<TopicDeletionResult>(
    `/api/v1/topics/${encodeURIComponent(topic)}/delete`,
    payload,
  );
}

export function recreateTopic(topic: string, payload: ConnectionPayload) {
  return postKafka<TopicRecreationResult>(
    `/api/v1/topics/${encodeURIComponent(topic)}/recreate`,
    payload,
  );
}

export function createTopic(
  topic: string,
  payload: ConnectionPayload,
  partitions: number,
  replicationFactor?: number,
) {
  return postKafka<CreatedTopicResult>(
    `/api/v1/topics/${encodeURIComponent(topic)}/create`,
    { ...payload, partitions, replicationFactor },
  );
}

export function searchTopicMessages(
  topic: string,
  payload: ConnectionPayload,
  search: MessageSearch,
  signal?: AbortSignal,
) {
  return postKafka<{
    topic: string;
    items: KafkaMessage[];
    total: number;
    scanned: number;
    truncated: boolean;
    estimatedMessages?: number;
  }>(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search`, {
    ...payload,
    ...search,
  }, signal);
}

export interface MessageSearchTaskStatus {
  scanned: number;
  elapsedMs: number;
  done: boolean;
  canceled: boolean;
  error?: string;
  response?: {
    topic: string;
    items: KafkaMessage[];
    total: number;
    scanned: number;
    truncated: boolean;
  };
}

export function startTopicMessageSearch(topic: string, payload: ConnectionPayload, search: MessageSearch) {
  return postKafka<{ taskId: string }>(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search/start`, {
    ...payload,
    ...search,
  });
}

export async function fetchTopicMessageSearchStatus(topic: string, taskID: string) {
  const response = await fetchBackend(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search/${encodeURIComponent(taskID)}`);
  const body = await readResponse<MessageSearchTaskStatus & { message?: string }>(response);
  if (!response.ok) throw new Error(body.message || "读取搜索进度失败");
  return body;
}

export function cancelTopicMessageSearch(topic: string, taskID: string) {
  return postKafka<{ success: boolean }>(
    `/api/v1/topics/${encodeURIComponent(topic)}/messages/search/${encodeURIComponent(taskID)}/cancel`,
    {},
  );
}

export function fetchTopicMessageEstimate(topic: string, payload: ConnectionPayload) {
  return postKafka<{ topic: string; estimatedMessages: number | null }>(
    `/api/v1/topics/${encodeURIComponent(topic)}/messages/estimate`,
    payload,
  );
}

export function readTopicMessage(topic: string, payload: ConnectionPayload, partition: number, offset: number) {
  return postKafka<KafkaMessage>(`/api/v1/topics/${encodeURIComponent(topic)}/messages/read`, {
    ...payload, partition, offset,
  });
}

export function produceTopicMessage(
  topic: string,
  payload: ConnectionPayload,
  key: string,
  value: string,
) {
  return postKafka<ProducedMessage>(
    `/api/v1/topics/${encodeURIComponent(topic)}/messages/produce`,
    { ...payload, key, value },
  );
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

export function deleteConsumer(groupId: string, payload: ConnectionPayload) {
  return postKafka<{ success: boolean; message: string }>(
    `/api/v1/consumers/${encodeURIComponent(groupId)}/delete`,
    payload,
  );
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
