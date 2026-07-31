import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { searchTopicMessages } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
import AppPagination from "@/components/AppPagination.vue";
const route = useRoute();
const connection = useConnectionStore();
const topic = computed(() => String(route.params.topic || ""));
const messages = ref([]);
const fromTime = ref("");
const toTime = ref("");
const keyword = ref("");
const limit = ref(20);
const scanLimit = ref(10000);
const loading = ref(false);
const loadError = ref("");
const scanned = ref(0);
const truncated = ref(false);
const expanded = ref(new Set());
const page = ref(1);
const pageSize = 10;
const copied = ref("");
const paginatedMessages = computed(() => {
    const start = (page.value - 1) * pageSize;
    return messages.value.slice(start, start + pageSize);
});
watch(() => messages.value.length, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page.value > lastPage)
        page.value = lastPage;
});
function toRFC3339(value) {
    return value ? new Date(value).toISOString() : "";
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
    loading.value = true;
    loadError.value = "";
    expanded.value = new Set();
    try {
        const response = await searchTopicMessages(topic.value, connection.form, {
            fromTime: toRFC3339(fromTime.value),
            toTime: toRFC3339(toTime.value),
            keyword: keyword.value.trim(),
            limit: limit.value,
            scanLimit: scanLimit.value,
        });
        messages.value = response.items;
        page.value = 1;
        scanned.value = response.scanned;
        truncated.value = response.truncated;
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
    fromTime.value = "";
    toTime.value = "";
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
    // 时间范围是可选条件。显式清空可避免浏览器或桌面 WebView 恢复上次的值，
    // 让用户只在主动选择时间后才看到日期。
    fromTime.value = "";
    toTime.value = "";
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
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "datetime-local",
    name: "message-search-from-time",
    autocomplete: "off",
    'aria-label': "开始时间（可选）",
});
(__VLS_ctx.fromTime);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "datetime-local",
    name: "message-search-to-time",
    autocomplete: "off",
    'aria-label': "结束时间（可选）",
});
(__VLS_ctx.toTime);
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
                    [topic, search, keyword, fromTime, toTime, limit, scanLimit, scanLimit, exportMessages, loading, loading, loading, loading, messages, messages, messages, resetSearch, pageSize, scanned, truncated, loadError, loadError, paginatedMessages, toggleMessage,];
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
    const __VLS_6 = AppPagination;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        page: (__VLS_ctx.page),
        pageSize: (__VLS_ctx.pageSize),
        total: (__VLS_ctx.messages.length),
    }));
    const __VLS_8 = __VLS_7({
        page: (__VLS_ctx.page),
        pageSize: (__VLS_ctx.pageSize),
        total: (__VLS_ctx.messages.length),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
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
