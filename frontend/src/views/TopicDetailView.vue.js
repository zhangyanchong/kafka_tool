import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { fetchTopicHealth, searchTopicMessages, } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
import AppPagination from "@/components/AppPagination.vue";
const route = useRoute();
const connection = useConnectionStore();
const topic = computed(() => String(route.params.topic || ""));
const messages = ref([]);
const fromDate = ref("");
const fromClock = ref("");
const toDate = ref("");
const toClock = ref("");
const keyword = ref("");
const limit = ref(20);
const scanLimit = ref(10000);
const loading = ref(false);
const loadError = ref("");
const scanned = ref(0);
const truncated = ref(false);
const estimatedMessages = ref(null);
const expanded = ref(new Set());
const page = ref(1);
const pageSize = 10;
const copied = ref("");
const topicHealth = ref(null);
const healthLoading = ref(false);
const healthError = ref("");
const healthCollapsed = ref(true);
const showAllPartitions = ref(false);
const healthPage = ref(1);
const healthPageSize = 10;
const paginatedMessages = computed(() => {
    const start = (page.value - 1) * pageSize;
    return messages.value.slice(start, start + pageSize);
});
const visibleHealthPartitions = computed(() => {
    const items = topicHealth.value?.items || [];
    return showAllPartitions.value ? items : items.filter((item) => !item.healthy);
});
const paginatedHealthPartitions = computed(() => {
    const start = (healthPage.value - 1) * healthPageSize;
    return visibleHealthPartitions.value.slice(start, start + healthPageSize);
});
watch(() => messages.value.length, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page.value > lastPage)
        page.value = lastPage;
});
watch(showAllPartitions, () => {
    healthPage.value = 1;
});
watch(() => visibleHealthPartitions.value.length, () => {
    const lastPage = Math.max(1, Math.ceil(visibleHealthPartitions.value.length / healthPageSize));
    if (healthPage.value > lastPage)
        healthPage.value = lastPage;
});
const healthIssueLabels = {
    partition_error: "Metadata 错误",
    leader_unavailable: "Leader 不可用",
    under_replicated: "ISR 副本不足",
    offline_replicas: "存在离线副本",
};
function todayValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function activateStartTime() {
    if (!fromDate.value)
        fromDate.value = todayValue();
    if (!fromClock.value)
        fromClock.value = "00:00";
}
function activateEndTime() {
    if (!toDate.value)
        toDate.value = todayValue();
    if (!toClock.value)
        toClock.value = "23:59";
}
function closeNativePicker(event) {
    const input = event.currentTarget;
    requestAnimationFrame(() => input.blur());
}
function toRFC3339(date, clock, fallbackClock) {
    if (!date)
        return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`日期格式必须是 YYYY-MM-DD，例如 2026-07-02：${date}`);
    }
    const value = new Date(`${date}T${clock || fallbackClock}:00`);
    const [year, month, day] = date.split("-").map(Number);
    if (Number.isNaN(value.getTime()) ||
        value.getFullYear() !== year ||
        value.getMonth() + 1 !== month ||
        value.getDate() !== day) {
        throw new Error(`日期不存在或格式不正确：${date}`);
    }
    return value.toISOString();
}
function normalizeDateInput(value) {
    const normalized = value.trim().replace(/[/.]/g, "-");
    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match)
        return normalized;
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}
function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}
function preview(value) {
    return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}
function messageId(message) {
    return `${message.partition}-${message.offset}`;
}
function healthMetric(value) {
    if (value !== undefined)
        return value.toLocaleString();
    return healthLoading.value ? "读取中" : "不可用";
}
function estimatedMessageMetric() {
    if (estimatedMessages.value != null)
        return estimatedMessages.value.toLocaleString("zh-CN");
    return loading.value ? "读取中" : "不可用";
}
function brokerList(values) {
    return values.length ? values.join(", ") : "无";
}
async function loadTopicHealth() {
    if (healthLoading.value)
        return;
    healthLoading.value = true;
    healthError.value = "";
    try {
        topicHealth.value = await fetchTopicHealth(topic.value, connection.form);
    }
    catch (reason) {
        topicHealth.value = null;
        healthError.value = reason instanceof Error ? reason.message : "Topic 健康状态读取失败";
    }
    finally {
        healthLoading.value = false;
    }
}
function toggleMessage(message) {
    const next = new Set(expanded.value);
    const id = messageId(message);
    next.has(id) ? next.delete(id) : next.add(id);
    expanded.value = next;
}
async function copyText(text, id) {
    try {
        await navigator.clipboard.writeText(text);
    }
    catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
    }
    copied.value = id;
    window.setTimeout(() => {
        if (copied.value === id)
            copied.value = "";
    }, 1400);
}
async function search() {
    const requestedScanLimit = Math.trunc(Number(scanLimit.value));
    if (!Number.isFinite(requestedScanLimit) || requestedScanLimit < 1 || requestedScanLimit > 1000000) {
        loadError.value = "最大查询条数必须在 1 到 1,000,000 之间";
        return;
    }
    scanLimit.value = requestedScanLimit;
    fromDate.value = normalizeDateInput(fromDate.value);
    toDate.value = normalizeDateInput(toDate.value);
    let normalizedFromTime = "";
    let normalizedToTime = "";
    try {
        normalizedFromTime = toRFC3339(fromDate.value, fromClock.value, "00:00");
        normalizedToTime = toRFC3339(toDate.value, toClock.value, "23:59");
    }
    catch (reason) {
        loadError.value = reason instanceof Error ? reason.message : "日期或时间格式不正确";
        return;
    }
    loading.value = true;
    loadError.value = "";
    expanded.value = new Set();
    try {
        const response = await searchTopicMessages(topic.value, connection.form, {
            fromTime: normalizedFromTime,
            toTime: normalizedToTime,
            keyword: keyword.value.trim(),
            limit: limit.value,
            scanLimit: scanLimit.value,
        });
        messages.value = response.items;
        page.value = 1;
        scanned.value = response.scanned;
        truncated.value = response.truncated;
        estimatedMessages.value = response.estimatedMessages ?? null;
    }
    catch (reason) {
        messages.value = [];
        loadError.value = reason instanceof Error ? reason.message : "消息读取失败";
    }
    finally {
        loading.value = false;
    }
}
function resetSearch() {
    fromDate.value = "";
    fromClock.value = "";
    toDate.value = "";
    toClock.value = "";
    keyword.value = "";
    limit.value = 20;
    scanLimit.value = 10000;
    search();
}
async function exportMessages() {
    if (!messages.value.length)
        return;
    const exportedAt = new Date();
    const jsonLines = messages.value
        .map((message) => JSON.stringify({ topic: topic.value, ...message }))
        .join("\n") + "\n";
    const safeTopic = topic.value.replace(/[^a-zA-Z0-9._-]+/g, "_") || "topic";
    const timestamp = exportedAt.toISOString().replace(/[:.]/g, "-");
    const filename = `${safeTopic}-${timestamp}.jsonl`;
    const nativeExport = window.go?.main?.App?.ExportFile;
    if (nativeExport) {
        try {
            await nativeExport(filename, jsonLines);
        }
        catch (reason) {
            loadError.value = reason instanceof Error ? reason.message : "导出文件失败";
        }
        return;
    }
    const blob = new Blob([jsonLines], {
        type: "application/x-ndjson;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
onMounted(() => {
    // 时间范围默认不启用，只有用户聚焦对应控件后才补入今天的起止时间。
    fromDate.value = "";
    fromClock.value = "";
    toDate.value = "";
    toClock.value = "";
    loadTopicHealth();
    search();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "list-page" },
});
/** @type {__VLS_StyleScopedClasses['list-page']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "back-link" },
    to: "/dashboard/topics",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "back-link" },
    to: "/dashboard/topics",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-heading detail-heading" },
});
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "section-kicker" },
});
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
(__VLS_ctx.topic);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "summary-grid topic-health-summary" },
});
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['topic-health-summary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.estimatedMessageMetric());
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.healthMetric(__VLS_ctx.topicHealth?.partitions));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.healthMetric(__VLS_ctx.topicHealth?.healthyPartitions));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: ({ warning: (__VLS_ctx.topicHealth?.problemPartitions || 0) > 0 }) },
});
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.healthMetric(__VLS_ctx.topicHealth?.problemPartitions));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: ({ warning: (__VLS_ctx.topicHealth?.noLeaderPartitions || 0) > 0 }) },
});
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.healthMetric(__VLS_ctx.topicHealth?.noLeaderPartitions));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "data-card topic-health-card" },
    ...{ class: ({ problem: (__VLS_ctx.topicHealth?.problemPartitions || 0) > 0 }) },
});
/** @type {__VLS_StyleScopedClasses['data-card']} */ ;
/** @type {__VLS_StyleScopedClasses['topic-health-card']} */ ;
/** @type {__VLS_StyleScopedClasses['problem']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "table-toolbar topic-health-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['table-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['topic-health-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "topic-health-actions" },
});
/** @type {__VLS_StyleScopedClasses['topic-health-actions']} */ ;
if (__VLS_ctx.healthLoading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else if (__VLS_ctx.healthError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else if (__VLS_ctx.topicHealth?.problemPartitions) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "health-problem" },
    });
    /** @type {__VLS_StyleScopedClasses['health-problem']} */ ;
    (__VLS_ctx.topicHealth.problemPartitions);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "health-ok" },
    });
    /** @type {__VLS_StyleScopedClasses['health-ok']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.loadTopicHealth) },
    type: "button",
    disabled: (__VLS_ctx.healthLoading),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.healthCollapsed = !__VLS_ctx.healthCollapsed);
            // @ts-ignore
            [topic, estimatedMessageMetric, healthMetric, healthMetric, healthMetric, healthMetric, topicHealth, topicHealth, topicHealth, topicHealth, topicHealth, topicHealth, topicHealth, topicHealth, topicHealth, healthLoading, healthLoading, healthError, loadTopicHealth, healthCollapsed, healthCollapsed,];
        } },
    type: "button",
    'aria-expanded': (!__VLS_ctx.healthCollapsed),
});
(__VLS_ctx.healthCollapsed ? "展开" : "收起");
if (!__VLS_ctx.healthCollapsed) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "health-filter-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['health-filter-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.healthCollapsed))
                    throw 0;
                return (__VLS_ctx.showAllPartitions = false);
                // @ts-ignore
                [healthCollapsed, healthCollapsed, healthCollapsed, showAllPartitions,];
            } },
        type: "button",
        ...{ class: ({ active: !__VLS_ctx.showAllPartitions }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.healthCollapsed))
                    throw 0;
                return (__VLS_ctx.showAllPartitions = true);
                // @ts-ignore
                [showAllPartitions, showAllPartitions,];
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.showAllPartitions }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.visibleHealthPartitions.length);
    if (__VLS_ctx.healthError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "member-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['member-empty']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.healthError);
    }
    else if (__VLS_ctx.paginatedHealthPartitions.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
        for (const [partition] of __VLS_vFor((__VLS_ctx.paginatedHealthPartitions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
                key: (partition.partition),
                ...{ class: ({ 'health-problem-row': !partition.healthy }) },
            });
            /** @type {__VLS_StyleScopedClasses['health-problem-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "partition-tag" },
            });
            /** @type {__VLS_StyleScopedClasses['partition-tag']} */ ;
            (partition.partition);
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            if (partition.leader >= 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (partition.leader);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "health-problem" },
                });
                /** @type {__VLS_StyleScopedClasses['health-problem']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (__VLS_ctx.brokerList(partition.replicas));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (__VLS_ctx.brokerList(partition.isr));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            (__VLS_ctx.brokerList(partition.offlineReplicas));
            __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
            if (partition.healthy) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "health-status healthy" },
                });
                /** @type {__VLS_StyleScopedClasses['health-status']} */ ;
                /** @type {__VLS_StyleScopedClasses['healthy']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "health-issues" },
                });
                /** @type {__VLS_StyleScopedClasses['health-issues']} */ ;
                for (const [issue] of __VLS_vFor((partition.issues))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        key: (issue),
                    });
                    (__VLS_ctx.healthIssueLabels[issue]);
                    // @ts-ignore
                    [healthError, healthError, showAllPartitions, visibleHealthPartitions, paginatedHealthPartitions, paginatedHealthPartitions, brokerList, brokerList, brokerList, healthIssueLabels,];
                }
                if (partition.errorMessage) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                    (partition.errorMessage);
                }
            }
            // @ts-ignore
            [];
        }
    }
    else if (!__VLS_ctx.healthLoading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "member-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['member-empty']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.showAllPartitions ? "没有分区 Metadata" : "没有异常分区");
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.showAllPartitions ? "Kafka 没有返回可展示的分区信息。" : "当前 Topic 的 Leader、ISR 和副本状态正常。");
    }
    if (__VLS_ctx.visibleHealthPartitions.length > __VLS_ctx.healthPageSize) {
        const __VLS_6 = AppPagination;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
            page: (__VLS_ctx.healthPage),
            pageSize: (__VLS_ctx.healthPageSize),
            total: (__VLS_ctx.visibleHealthPartitions.length),
        }));
        const __VLS_8 = __VLS_7({
            page: (__VLS_ctx.healthPage),
            pageSize: (__VLS_ctx.healthPageSize),
            total: (__VLS_ctx.visibleHealthPartitions.length),
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.search) },
    ...{ class: "message-search-card" },
});
/** @type {__VLS_StyleScopedClasses['message-search-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "content-search" },
});
/** @type {__VLS_StyleScopedClasses['content-search']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-box wide" },
});
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "11",
    cy: "11",
    r: "6.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "m16 16 4 4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    placeholder: "输入关键字，匹配消息 Key 或内容",
});
(__VLS_ctx.keyword);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "datetime-label" },
});
/** @type {__VLS_StyleScopedClasses['datetime-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "datetime-fields" },
});
/** @type {__VLS_StyleScopedClasses['datetime-fields']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onFocus: (__VLS_ctx.activateStartTime) },
    ...{ onChange: (__VLS_ctx.closeNativePicker) },
    ...{ class: "date-entry" },
    type: "date",
    name: "message-search-from-date",
    autocomplete: "off",
    lang: "en-CA",
    'aria-label': "开始日期",
});
(__VLS_ctx.fromDate);
/** @type {__VLS_StyleScopedClasses['date-entry']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onFocus: (__VLS_ctx.activateStartTime) },
    ...{ onChange: (__VLS_ctx.closeNativePicker) },
    ...{ class: "clock-entry" },
    type: "time",
    name: "message-search-from-clock",
    step: "60",
    'aria-label': "开始时分",
});
(__VLS_ctx.fromClock);
/** @type {__VLS_StyleScopedClasses['clock-entry']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "datetime-label end-datetime-label" },
});
/** @type {__VLS_StyleScopedClasses['datetime-label']} */ ;
/** @type {__VLS_StyleScopedClasses['end-datetime-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "datetime-fields" },
});
/** @type {__VLS_StyleScopedClasses['datetime-fields']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onFocus: (__VLS_ctx.activateEndTime) },
    ...{ onChange: (__VLS_ctx.closeNativePicker) },
    ...{ class: "date-entry" },
    type: "date",
    name: "message-search-to-date",
    autocomplete: "off",
    lang: "en-CA",
    'aria-label': "结束日期",
});
(__VLS_ctx.toDate);
/** @type {__VLS_StyleScopedClasses['date-entry']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onFocus: (__VLS_ctx.activateEndTime) },
    ...{ onChange: (__VLS_ctx.closeNativePicker) },
    ...{ class: "clock-entry" },
    type: "time",
    name: "message-search-to-clock",
    step: "60",
    'aria-label': "结束时分",
});
(__VLS_ctx.toClock);
/** @type {__VLS_StyleScopedClasses['clock-entry']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.limit),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: (20),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: (100),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: (1000),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: (10000),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "1",
    max: "1000000",
    step: "1",
    inputmode: "numeric",
    required: true,
    placeholder: "默认 10000，最多 1000000",
});
(__VLS_ctx.scanLimit);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "message-search-actions" },
});
/** @type {__VLS_StyleScopedClasses['message-search-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.exportMessages) },
    type: "button",
    ...{ class: "export-button" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.messages.length),
});
/** @type {__VLS_StyleScopedClasses['export-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.resetSearch) },
    type: "button",
    ...{ class: "clear-button" },
    disabled: (__VLS_ctx.loading),
});
/** @type {__VLS_StyleScopedClasses['clear-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    type: "submit",
    ...{ class: "search-button" },
    disabled: (__VLS_ctx.loading),
});
/** @type {__VLS_StyleScopedClasses['search-button']} */ ;
(__VLS_ctx.loading ? "搜索中…" : "搜索消息");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-meta" },
});
/** @type {__VLS_StyleScopedClasses['search-meta']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.messages.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.pageSize);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.scanned.toLocaleString());
if (__VLS_ctx.truncated) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "scan-warning" },
    });
    /** @type {__VLS_StyleScopedClasses['scan-warning']} */ ;
    (__VLS_ctx.scanLimit.toLocaleString());
}
if (__VLS_ctx.loadError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "notice error message-error" },
    });
    /** @type {__VLS_StyleScopedClasses['notice']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    /** @type {__VLS_StyleScopedClasses['message-error']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.loadError);
}
if (__VLS_ctx.messages.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-list" },
    });
    /** @type {__VLS_StyleScopedClasses['message-list']} */ ;
    for (const [message] of __VLS_vFor((__VLS_ctx.paginatedMessages))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.messages.length))
                        throw 0;
                    return (__VLS_ctx.toggleMessage(message));
                    // @ts-ignore
                    [healthLoading, showAllPartitions, showAllPartitions, visibleHealthPartitions, visibleHealthPartitions, healthPageSize, healthPageSize, healthPage, search, keyword, activateStartTime, activateStartTime, closeNativePicker, closeNativePicker, closeNativePicker, closeNativePicker, fromDate, fromClock, activateEndTime, activateEndTime, toDate, toClock, limit, scanLimit, scanLimit, exportMessages, loading, loading, loading, loading, messages, messages, messages, resetSearch, pageSize, scanned, truncated, loadError, loadError, paginatedMessages, toggleMessage,];
                } },
            key: (__VLS_ctx.messageId(message)),
            ...{ class: "message-card" },
        });
        /** @type {__VLS_StyleScopedClasses['message-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "partition-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['partition-tag']} */ ;
        (message.partition);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "offset-label" },
        });
        /** @type {__VLS_StyleScopedClasses['offset-label']} */ ;
        (message.offset.toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.time, __VLS_intrinsics.time)({});
        (__VLS_ctx.formatTime(message.timestamp));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.formatBytes(message.size));
        if (message.key) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "message-key" },
            });
            /** @type {__VLS_StyleScopedClasses['message-key']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({
                ...{ onClick: () => { } },
            });
            (message.key);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.messages.length))
                            throw 0;
                        if (!(message.key))
                            throw 0;
                        return (__VLS_ctx.copyText(message.key, `key-${__VLS_ctx.messageId(message)}`));
                        // @ts-ignore
                        [messageId, messageId, formatTime, formatBytes, copyText,];
                    } },
                type: "button",
            });
            (__VLS_ctx.copied === `key-${__VLS_ctx.messageId(message)}` ? "已复制" : "复制 Key");
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "message-content" },
        });
        /** @type {__VLS_StyleScopedClasses['message-content']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.pre, __VLS_intrinsics.pre)({
            ...{ onClick: () => { } },
        });
        (__VLS_ctx.expanded.has(__VLS_ctx.messageId(message)) ? message.value : __VLS_ctx.preview(message.value));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.messages.length))
                        throw 0;
                    return (__VLS_ctx.copyText(message.value, `value-${__VLS_ctx.messageId(message)}`));
                    // @ts-ignore
                    [messageId, messageId, messageId, copyText, copied, expanded, preview,];
                } },
            type: "button",
        });
        (__VLS_ctx.copied === `value-${__VLS_ctx.messageId(message)}` ? "已复制" : "复制内容");
        if (message.value.length > 240) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({});
            (__VLS_ctx.expanded.has(__VLS_ctx.messageId(message)) ? "收起内容" : "展开完整内容");
        }
        // @ts-ignore
        [messageId, messageId, copied, expanded,];
    }
    const __VLS_11 = AppPagination;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
        page: (__VLS_ctx.page),
        pageSize: (__VLS_ctx.pageSize),
        total: (__VLS_ctx.messages.length),
    }));
    const __VLS_13 = __VLS_12({
        page: (__VLS_ctx.page),
        pageSize: (__VLS_ctx.pageSize),
        total: (__VLS_ctx.messages.length),
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
}
else if (!__VLS_ctx.loading && !__VLS_ctx.loadError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "data-card" },
    });
    /** @type {__VLS_StyleScopedClasses['data-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state message-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    /** @type {__VLS_StyleScopedClasses['message-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M5 7h14v10H5zM8 4h8M8 20h8",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M9 11h6M9 14h4",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "data-card" },
    });
    /** @type {__VLS_StyleScopedClasses['data-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state message-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    /** @type {__VLS_StyleScopedClasses['message-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loading-ring" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-ring']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
// @ts-ignore
[loading, loading, messages, pageSize, loadError, page,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
