async function readResponse(response) {
    const text = await response.text();
    if (!text) {
        throw new Error(`服务返回空响应（HTTP ${response.status}）`);
    }
    try {
        return JSON.parse(text);
    }
    catch {
        const detail = text.trim();
        throw new Error(response.status === 404
            ? "后端接口不存在，请重启最新版本的 Go 服务"
            : `后端返回了非 JSON 数据（HTTP ${response.status}）：${detail}`);
    }
}
async function requestLinuxDesktop(api, path, init) {
    const signal = init?.signal;
    const abortReason = () => signal?.reason ?? new DOMException("Aborted", "AbortError");
    if (signal?.aborted)
        throw abortReason();
    let onAbort;
    let cancelNative;
    const aborted = new Promise((_, reject) => {
        if (signal) {
            onAbort = () => {
                void cancelNative?.();
                reject(abortReason());
            };
            signal.addEventListener("abort", onAbort, { once: true });
        }
    });
    const request = async () => {
        const id = await api.BeginRequest();
        cancelNative = () => api.CancelRequest(id).catch(() => { });
        // Dispatch even after cancellation so the native request entry is released.
        if (signal?.aborted)
            await cancelNative();
        return api.Request(id, init?.method ?? "GET", path, String(init?.body ?? ""));
    };
    try {
        const result = await Promise.race([request(), aborted]);
        return new Response(result.body, {
            status: result.status,
            headers: { "Content-Type": "application/json" },
        });
    }
    finally {
        if (onAbort)
            signal?.removeEventListener("abort", onAbort);
    }
}
// Keep transport failures distinct from Kafka errors returned by the backend.
async function fetchBackend(path, init) {
    try {
        const api = typeof window === "undefined" ? undefined :
            window.go?.main?.LinuxAPIBridge;
        return api ? await requestLinuxDesktop(api, path, init) : await fetch(path, init);
    }
    catch (reason) {
        if (init?.signal?.aborted || (reason instanceof Error && reason.name === "AbortError")) {
            throw reason;
        }
        const detail = reason instanceof Error ? reason.message : String(reason);
        throw new Error(`界面未能获取程序后端的响应，暂时无法确认 Kafka 连接结果。` +
            `请通过 bash launch.sh 启动并重试，查看终端及启动日志。` +
            `接口：${path}；原始错误：${detail}`);
    }
}
export async function testConnection(payload) {
    const response = await fetchBackend("/api/v1/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const body = await readResponse(response);
    if (!response.ok)
        throw new Error(`${body.message || "连接测试失败"}\nHTTP 状态：${response.status}\n后端响应：${JSON.stringify(body, null, 2)}`);
    return body;
}
async function postKafka(path, payload, signal) {
    const response = await fetchBackend(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
    });
    const body = await readResponse(response);
    if (!response.ok)
        throw new Error(body.message || "读取 Kafka 数据失败");
    return body;
}
export function listTopics(payload) {
    return postKafka("/api/v1/topics/list", payload);
}
export function fetchTopicHealth(topic, payload) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/health`, payload);
}
export function fetchTopicDeletionPlan(topic, payload) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/deletion-plan`, payload);
}
export function deleteTopic(topic, payload) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/delete`, payload);
}
export function recreateTopic(topic, payload) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/recreate`, payload);
}
export function createTopic(topic, payload, partitions, replicationFactor) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/create`, { ...payload, partitions, replicationFactor });
}
export function searchTopicMessages(topic, payload, search, signal) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search`, {
        ...payload,
        ...search,
    }, signal);
}
export function startTopicMessageSearch(topic, payload, search) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search/start`, {
        ...payload,
        ...search,
    });
}
export async function fetchTopicMessageSearchStatus(topic, taskID) {
    const response = await fetchBackend(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search/${encodeURIComponent(taskID)}`);
    const body = await readResponse(response);
    if (!response.ok)
        throw new Error(body.message || "读取搜索进度失败");
    return body;
}
export function cancelTopicMessageSearch(topic, taskID) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/search/${encodeURIComponent(taskID)}/cancel`, {});
}
export function fetchTopicMessageEstimate(topic, payload) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/estimate`, payload);
}
export function readTopicMessage(topic, payload, partition, offset) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/read`, {
        ...payload, partition, offset,
    });
}
export function produceTopicMessage(topic, payload, key, value) {
    return postKafka(`/api/v1/topics/${encodeURIComponent(topic)}/messages/produce`, { ...payload, key, value });
}
export function listConsumers(payload) {
    return postKafka("/api/v1/consumers/list", payload);
}
export function listConsumerPartitions(groupId, payload) {
    return postKafka(`/api/v1/consumers/${encodeURIComponent(groupId)}/partitions`, payload);
}
export function deleteConsumer(groupId, payload) {
    return postKafka(`/api/v1/consumers/${encodeURIComponent(groupId)}/delete`, payload);
}
export function fetchMetricSnapshot(payload, topic, groupId) {
    return postKafka("/api/v1/metrics/snapshot", {
        ...payload,
        topic,
        groupId,
    });
}
