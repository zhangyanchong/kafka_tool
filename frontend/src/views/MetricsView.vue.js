import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LineChart from "@/components/LineChart.vue";
import { fetchMetricSnapshot, listConsumers, listTopics, } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
const connection = useConnectionStore();
const topics = ref([]);
const consumers = ref([]);
const selectedTopic = ref("");
const selectedGroup = ref("");
const samplingSeconds = ref(30);
const samples = ref([]);
const loadingOptions = ref(false);
const refreshing = ref(false);
const monitoring = ref(false);
const error = ref("");
let timer;
const latest = computed(() => samples.value[samples.value.length - 1]);
const measuredSamples = computed(() => samples.value.slice(1));
const latestMeasurement = computed(() => measuredSamples.value[measuredSamples.value.length - 1]);
const previousSnapshot = computed(() => samples.value.length >= 2 ? samples.value[samples.value.length - 2] : undefined);
const labels = computed(() => measuredSamples.value.map((item) => new Date(item.timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
})));
const throughputSeries = computed(() => [
    { name: "Topic 实际生成", color: "#ff7048", values: measuredSamples.value.map((item) => item.producedDelta) },
    { name: "Consumer 实际消费", color: "#58d996", values: measuredSamples.value.map((item) => item.consumedDelta) },
]);
const offsetSeries = computed(() => [
    { name: "End Offset", color: "#4da3ff", values: measuredSamples.value.map((item) => item.endOffset) },
    { name: "Committed Offset", color: "#ff7849", dash: "7 5", values: measuredSamples.value.map((item) => item.committedOffset) },
]);
const lagSeries = computed(() => [
    { name: "Consumer Lag", color: "#ffb057", values: measuredSamples.value.map((item) => item.lag) },
]);
const samplingLabel = computed(() => {
    if (samplingSeconds.value < 60)
        return `${samplingSeconds.value} 秒`;
    return `${samplingSeconds.value / 60} 分钟`;
});
function formatNumber(value) {
    return (value ?? 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}
async function loadOptions() {
    loadingOptions.value = true;
    error.value = "";
    try {
        const [topicResponse, consumerResponse] = await Promise.all([
            listTopics(connection.form),
            listConsumers(connection.form),
        ]);
        topics.value = topicResponse.items;
        consumers.value = consumerResponse.items;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : "监控选项读取失败";
    }
    finally {
        loadingOptions.value = false;
    }
}
async function takeSnapshot() {
    if (!selectedTopic.value || !selectedGroup.value || refreshing.value)
        return false;
    refreshing.value = true;
    error.value = "";
    try {
        const snapshot = await fetchMetricSnapshot(connection.form, selectedTopic.value, selectedGroup.value);
        const previous = samples.value[samples.value.length - 1];
        let producedDelta = 0;
        let consumedDelta = 0;
        let elapsedSeconds = 0;
        if (previous) {
            elapsedSeconds = Math.max(1, (new Date(snapshot.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000);
            producedDelta = Math.max(0, snapshot.endOffset - previous.endOffset);
            consumedDelta = Math.max(0, snapshot.committedOffset - previous.committedOffset);
        }
        samples.value.push({ ...snapshot, producedDelta, consumedDelta, elapsedSeconds });
        samples.value = samples.value.slice(-21);
        return true;
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : "指标快照读取失败";
        return false;
    }
    finally {
        refreshing.value = false;
    }
}
async function startMonitoring() {
    if (!topics.value.some((item) => item.name === selectedTopic.value)) {
        error.value = "请选择列表中存在的 Topic";
        return;
    }
    if (!consumers.value.some((item) => item.groupId === selectedGroup.value)) {
        error.value = "请选择一个 Consumer Group";
        return;
    }
    if (timer)
        window.clearInterval(timer);
    samples.value = [];
    monitoring.value = true;
    const started = await takeSnapshot();
    if (!started) {
        monitoring.value = false;
        return;
    }
    timer = window.setInterval(takeSnapshot, samplingSeconds.value * 1000);
}
function stopMonitoring() {
    if (timer)
        window.clearInterval(timer);
    timer = undefined;
    monitoring.value = false;
}
onMounted(loadOptions);
onBeforeUnmount(() => {
    if (timer)
        window.clearInterval(timer);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "list-page metrics-page" },
});
/** @type {__VLS_StyleScopedClasses['list-page']} */ ;
/** @type {__VLS_StyleScopedClasses['metrics-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-heading" },
});
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "section-kicker" },
});
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "read-only-badge" },
});
/** @type {__VLS_StyleScopedClasses['read-only-badge']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.startMonitoring) },
    ...{ class: "metrics-filter" },
});
/** @type {__VLS_StyleScopedClasses['metrics-filter']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "topic-picker" },
});
/** @type {__VLS_StyleScopedClasses['topic-picker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    list: "metric-topics",
    placeholder: "输入 Topic 名称搜索",
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.monitoring),
});
(__VLS_ctx.selectedTopic);
__VLS_asFunctionalElement1(__VLS_intrinsics.datalist, __VLS_intrinsics.datalist)({
    id: "metric-topics",
});
for (const [topic] of __VLS_vFor((__VLS_ctx.topics))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (topic.name),
        value: (topic.name),
    });
    // @ts-ignore
    [startMonitoring, loadingOptions, monitoring, selectedTopic, topics,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedGroup),
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.monitoring),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
    disabled: true,
});
for (const [consumer] of __VLS_vFor((__VLS_ctx.consumers))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (consumer.groupId),
        value: (consumer.groupId),
    });
    (consumer.groupId);
    // @ts-ignore
    [loadingOptions, monitoring, selectedGroup, consumers,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "period-picker" },
});
/** @type {__VLS_StyleScopedClasses['period-picker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
for (const [period] of __VLS_vFor(([{ seconds: 30, label: '30 秒' }, { seconds: 60, label: '1 分钟' }, { seconds: 120, label: '2 分钟' }, { seconds: 300, label: '5 分钟' }]))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                return (__VLS_ctx.samplingSeconds = period.seconds);
                // @ts-ignore
                [samplingSeconds,];
            } },
        key: (period.seconds),
        type: "button",
        ...{ class: ({ active: __VLS_ctx.samplingSeconds === period.seconds }) },
        disabled: (__VLS_ctx.monitoring),
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (period.label);
    // @ts-ignore
    [monitoring, samplingSeconds,];
}
if (!__VLS_ctx.monitoring) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "monitor-button" },
        type: "submit",
        disabled: (__VLS_ctx.refreshing || __VLS_ctx.loadingOptions),
    });
    /** @type {__VLS_StyleScopedClasses['monitor-button']} */ ;
    (__VLS_ctx.refreshing ? "正在启动…" : "开始监控");
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "monitor-controls" },
    });
    /** @type {__VLS_StyleScopedClasses['monitor-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
    (__VLS_ctx.refreshing ? "正在采集…" : "监控中");
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.stopMonitoring) },
        type: "button",
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "notice error metrics-error" },
    });
    /** @type {__VLS_StyleScopedClasses['notice']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    /** @type {__VLS_StyleScopedClasses['metrics-error']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "metric-kpis" },
});
/** @type {__VLS_StyleScopedClasses['metric-kpis']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.formatNumber(__VLS_ctx.latestMeasurement?.producedDelta));
if (__VLS_ctx.latestMeasurement && __VLS_ctx.previousSnapshot) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.previousSnapshot.endOffset));
    (__VLS_ctx.formatNumber(__VLS_ctx.latestMeasurement.endOffset));
    (Math.round(__VLS_ctx.latestMeasurement.elapsedSeconds));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.samplingLabel);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.formatNumber(__VLS_ctx.latestMeasurement?.consumedDelta));
if (__VLS_ctx.latestMeasurement && __VLS_ctx.previousSnapshot) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.previousSnapshot.committedOffset));
    (__VLS_ctx.formatNumber(__VLS_ctx.latestMeasurement.committedOffset));
    (Math.round(__VLS_ctx.latestMeasurement.elapsedSeconds));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.samplingLabel);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.formatNumber(__VLS_ctx.latest?.endOffset));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
(__VLS_ctx.latest?.partitions || 0);
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: ({ warning: (__VLS_ctx.latest?.lag || 0) > 0 }) },
});
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.formatNumber(__VLS_ctx.latest?.lag));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chart-grid" },
});
/** @type {__VLS_StyleScopedClasses['chart-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "chart-card" },
});
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.samplingLabel);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
const __VLS_0 = LineChart;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    labels: (__VLS_ctx.labels),
    series: (__VLS_ctx.throughputSeries),
}));
const __VLS_2 = __VLS_1({
    labels: (__VLS_ctx.labels),
    series: (__VLS_ctx.throughputSeries),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "chart-card" },
});
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
(__VLS_ctx.samplingLabel);
const __VLS_5 = LineChart;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    labels: (__VLS_ctx.labels),
    series: (__VLS_ctx.offsetSeries),
    zeroBased: (false),
}));
const __VLS_7 = __VLS_6({
    labels: (__VLS_ctx.labels),
    series: (__VLS_ctx.offsetSeries),
    zeroBased: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "chart-card wide" },
});
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
const __VLS_10 = LineChart;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    labels: (__VLS_ctx.labels),
    series: (__VLS_ctx.lagSeries),
}));
const __VLS_12 = __VLS_11({
    labels: (__VLS_ctx.labels),
    series: (__VLS_ctx.lagSeries),
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "sampling-note" },
});
/** @type {__VLS_StyleScopedClasses['sampling-note']} */ ;
(__VLS_ctx.samplingLabel);
// @ts-ignore
[loadingOptions, monitoring, refreshing, refreshing, refreshing, stopMonitoring, error, error, formatNumber, formatNumber, formatNumber, formatNumber, formatNumber, formatNumber, formatNumber, formatNumber, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, previousSnapshot, previousSnapshot, previousSnapshot, previousSnapshot, samplingLabel, samplingLabel, samplingLabel, samplingLabel, samplingLabel, latest, latest, latest, latest, labels, labels, labels, throughputSeries, offsetSeries, lagSeries,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
