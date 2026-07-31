async function readResponse(response) {
    const text = await response.text();
    if (!text) {
        throw new Error(`服务返回空响应（HTTP ${response.status}）`);
    }
    try {
        return JSON.parse(text);
    }
    catch {
        const detail = text.trim().replace(/\s+/g, " ").slice(0, 160);
        throw new Error(response.status === 404
            ? "后端接口不存在，请重启最新版本的 Go 服务"
            : `后端返回了非 JSON 数据（HTTP ${response.status}）：${detail}`);
    }
}
export async function testConnection(payload) {
    const response = await fetch("/api/v1/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const body = await readResponse(response);
    if (!response.ok)
        throw new Error(body.message || "连接测试失败");
    return body;
}
async function postKafka(path, payload) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const body = await readResponse(response);
    if (!response.ok)
        throw new Error(body.message || "读取 Kafka 数据失败");
    return body;
}
export function listTopics(payload) {
    return postKafka("/api/v1/topics/list", payload);
}
export function searchTopicMessages(topic, payload, search) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search`, {
        ...payload,
        ...search,
    });
}
export function listConsumers(payload) {
    return postKafka("/api/v1/consumers/list", payload);
}
export function listConsumerPartitions(groupId, payload) {
    return postKafka(`/api/v1/consumers/${encodeURIComponent(groupId)}/partitions`, payload);
}
export function fetchMetricSnapshot(payload, topic, groupId) {
    return postKafka("/api/v1/metrics/snapshot", {
        ...payload,
        topic,
        groupId,
    });
}
