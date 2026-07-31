import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LineChart from "@/components/LineChart.vue";
import { fetchMetricSnapshot, listConsumers, listTopics, } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
const connection = useConnectionStore();
const topics = ref([]);
const consumers = ref([]);
const selectedTopic = ref("");
const selectedGroup = ref("");
const monitoredGroup = ref("");
const samplingSeconds = ref(30);
const samples = ref([]);
const loadingOptions = ref(false);
const refreshing = ref(false);
const monitoring = ref(false);
const error = ref("");
const consumerOptionsError = ref("");
const topicPickerOpen = ref(false);
const consumerPickerOpen = ref(false);
let timer;
const latest = computed(() => samples.value[samples.value.length - 1]);
const measuredSamples = computed(() => samples.value.slice(1));
const latestMeasurement = computed(() => measuredSamples.value[measuredSamples.value.length - 1]);
const hasConsumerMetrics = computed(() => Boolean(samples.value.length ? monitoredGroup.value : selectedGroup.value));
const sortedConsumers = computed(() => [...consumers.value].sort((left, right) => {
    const rank = (state) => {
        const normalized = state.trim().toLowerCase();
        if (normalized === "stable")
            return 0;
        if (["preparingrebalance", "completingrebalance", "assigning", "reconciling"].includes(normalized))
            return 1;
        if (!normalized)
            return 2;
        if (normalized === "empty")
            return 3;
        if (normalized === "dead")
            return 4;
        return 2;
    };
    return rank(left.state) - rank(right.state) || left.groupId.localeCompare(right.groupId);
}));
const filteredTopics = computed(() => {
    const keyword = selectedTopic.value.trim().toLocaleLowerCase();
    const items = keyword
        ? topics.value.filter((item) => item.name.toLocaleLowerCase().includes(keyword))
        : topics.value;
    return items.slice(0, 50);
});
const filteredConsumers = computed(() => {
    const keyword = selectedGroup.value.trim().toLocaleLowerCase();
    const items = keyword
        ? sortedConsumers.value.filter((item) => item.groupId.toLocaleLowerCase().includes(keyword) ||
            item.state.toLocaleLowerCase().includes(keyword))
        : sortedConsumers.value;
    return items.slice(0, 50);
});
const previousSnapshot = computed(() => samples.value.length >= 2 ? samples.value[samples.value.length - 2] : undefined);
const labels = computed(() => measuredSamples.value.map((item) => new Date(item.timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
})));
const throughputSeries = computed(() => {
    const series = [
        { name: "Topic 实际生成", color: "#ff7048", values: measuredSamples.value.map((item) => item.producedDelta) },
    ];
    if (hasConsumerMetrics.value) {
        series.push({ name: "Consumer 实际消费", color: "#58d996", values: measuredSamples.value.map((item) => item.consumedDelta) });
    }
    return series;
});
const offsetSeries = computed(() => {
    const series = [
        { name: "End Offset", color: "#4da3ff", values: measuredSamples.value.map((item) => item.endOffset) },
    ];
    if (hasConsumerMetrics.value) {
        series.push({ name: "Committed Offset", color: "#ff7849", dash: "7 5", values: measuredSamples.value.map((item) => item.committedOffset) });
    }
    return series;
});
const lagSeries = computed(() => [
    { name: "Consumer Lag", color: "#ffb057", values: measuredSamples.value.map((item) => item.lag) },
]);
const samplingLabel = computed(() => {
    if (samplingSeconds.value < 60)
        return `${samplingSeconds.value} 秒`;
    return `${samplingSeconds.value / 60} 分钟`;
});
function formatNumber(value) {
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}
function metricDisplay(value) {
    return value === undefined ? "待采样" : formatNumber(value);
}
async function loadOptions() {
    loadingOptions.value = true;
    error.value = "";
    consumerOptionsError.value = "";
    try {
        const [topicResult, consumerResult] = await Promise.allSettled([
            listTopics(connection.form),
            listConsumers(connection.form),
        ]);
        if (topicResult.status === "rejected")
            throw topicResult.reason;
        topics.value = topicResult.value.items;
        if (consumerResult.status === "fulfilled") {
            consumers.value = consumerResult.value.items;
        }
        else {
            consumers.value = [];
            consumerOptionsError.value = "消费组列表不可用，仍可仅监控 Topic";
        }
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : "监控选项读取失败";
    }
    finally {
        loadingOptions.value = false;
    }
}
async function takeSnapshot() {
    if (!selectedTopic.value || refreshing.value)
        return false;
    refreshing.value = true;
    error.value = "";
    try {
        const snapshot = await fetchMetricSnapshot(connection.form, selectedTopic.value, monitoredGroup.value);
        const previous = samples.value[samples.value.length - 1];
        let producedDelta = 0;
        let consumedDelta = 0;
        let elapsedSeconds = 0;
        if (previous) {
            elapsedSeconds = Math.max(1, (new Date(snapshot.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000);
            producedDelta = Math.max(0, snapshot.endOffset - previous.endOffset);
            if (snapshot.hasConsumer && previous.hasConsumer) {
                consumedDelta = Math.max(0, snapshot.committedOffset - previous.committedOffset);
            }
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
    if (selectedGroup.value && !consumers.value.some((item) => item.groupId === selectedGroup.value)) {
        error.value = "请选择列表中存在的 Consumer Group，或不选择以仅监控 Topic";
        return;
    }
    if (timer)
        window.clearInterval(timer);
    samples.value = [];
    monitoredGroup.value = selectedGroup.value;
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
function clearSamples() {
    samples.value = [];
}
function selectTopic(name) {
    selectedTopic.value = name;
    topicPickerOpen.value = false;
}
function closeTopicPicker() {
    window.setTimeout(() => {
        topicPickerOpen.value = false;
    }, 100);
}
function selectConsumer(groupId) {
    selectedGroup.value = groupId;
    consumerPickerOpen.value = false;
}
function closeConsumerPicker() {
    window.setTimeout(() => {
        consumerPickerOpen.value = false;
    }, 100);
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
    ...{ onFocus: (...[$event]) => {
            return (__VLS_ctx.topicPickerOpen = true);
            // @ts-ignore
            [startMonitoring, topicPickerOpen,];
        } },
    ...{ onInput: (...[$event]) => {
            return (__VLS_ctx.topicPickerOpen = true);
            // @ts-ignore
            [topicPickerOpen,];
        } },
    ...{ onBlur: (__VLS_ctx.closeTopicPicker) },
    placeholder: "输入 Topic 名称搜索",
    autocomplete: "off",
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.monitoring),
});
(__VLS_ctx.selectedTopic);
if (__VLS_ctx.topicPickerOpen && !__VLS_ctx.loadingOptions && !__VLS_ctx.monitoring) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "topic-options" },
    });
    /** @type {__VLS_StyleScopedClasses['topic-options']} */ ;
    for (const [topic] of __VLS_vFor((__VLS_ctx.filteredTopics))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onMousedown: (...[$event]) => {
                    if (!(__VLS_ctx.topicPickerOpen && !__VLS_ctx.loadingOptions && !__VLS_ctx.monitoring))
                        throw 0;
                    return (__VLS_ctx.selectTopic(topic.name));
                    // @ts-ignore
                    [topicPickerOpen, closeTopicPicker, loadingOptions, loadingOptions, monitoring, monitoring, selectedTopic, filteredTopics, selectTopic,];
                } },
            key: (topic.name),
            type: "button",
            ...{ class: ({ active: topic.name === __VLS_ctx.selectedTopic }) },
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (topic.name);
        // @ts-ignore
        [selectedTopic,];
    }
    if (__VLS_ctx.filteredTopics.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    }
    else if (__VLS_ctx.filteredTopics.length === 50) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "consumer-picker" },
});
/** @type {__VLS_StyleScopedClasses['consumer-picker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onFocus: (...[$event]) => {
            return (__VLS_ctx.consumerPickerOpen = true);
            // @ts-ignore
            [filteredTopics, filteredTopics, consumerPickerOpen,];
        } },
    ...{ onInput: (...[$event]) => {
            return (__VLS_ctx.consumerPickerOpen = true);
            // @ts-ignore
            [consumerPickerOpen,];
        } },
    ...{ onBlur: (__VLS_ctx.closeConsumerPicker) },
    placeholder: (__VLS_ctx.consumerOptionsError || '输入消费组名称搜索；留空则仅监控 Topic'),
    autocomplete: "off",
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.monitoring || Boolean(__VLS_ctx.consumerOptionsError)),
});
(__VLS_ctx.selectedGroup);
if (__VLS_ctx.consumerPickerOpen && !__VLS_ctx.loadingOptions && !__VLS_ctx.monitoring && !__VLS_ctx.consumerOptionsError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "topic-options consumer-options" },
    });
    /** @type {__VLS_StyleScopedClasses['topic-options']} */ ;
    /** @type {__VLS_StyleScopedClasses['consumer-options']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onMousedown: (...[$event]) => {
                if (!(__VLS_ctx.consumerPickerOpen && !__VLS_ctx.loadingOptions && !__VLS_ctx.monitoring && !__VLS_ctx.consumerOptionsError))
                    throw 0;
                return (__VLS_ctx.selectConsumer(''));
                // @ts-ignore
                [loadingOptions, loadingOptions, monitoring, monitoring, consumerPickerOpen, closeConsumerPicker, consumerOptionsError, consumerOptionsError, consumerOptionsError, selectedGroup, selectConsumer,];
            } },
        type: "button",
        ...{ class: ({ active: !__VLS_ctx.selectedGroup }) },
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    for (const [consumer] of __VLS_vFor((__VLS_ctx.filteredConsumers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onMousedown: (...[$event]) => {
                    if (!(__VLS_ctx.consumerPickerOpen && !__VLS_ctx.loadingOptions && !__VLS_ctx.monitoring && !__VLS_ctx.consumerOptionsError))
                        throw 0;
                    return (__VLS_ctx.selectConsumer(consumer.groupId));
                    // @ts-ignore
                    [selectedGroup, selectConsumer, filteredConsumers,];
                } },
            key: (consumer.groupId),
            type: "button",
            ...{ class: ({ active: consumer.groupId === __VLS_ctx.selectedGroup }) },
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
        (consumer.groupId);
        if (consumer.state) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.em, __VLS_intrinsics.em)({});
            (consumer.state);
        }
        // @ts-ignore
        [selectedGroup,];
    }
    if (__VLS_ctx.filteredConsumers.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    }
    else if (__VLS_ctx.filteredConsumers.length === 50) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    }
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
                [filteredConsumers, filteredConsumers, samplingSeconds,];
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "metrics-actions" },
});
/** @type {__VLS_StyleScopedClasses['metrics-actions']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.clearSamples) },
    ...{ class: "clear-chart-button" },
    type: "button",
    disabled: (__VLS_ctx.samples.length === 0),
});
/** @type {__VLS_StyleScopedClasses['clear-chart-button']} */ ;
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
    ...{ class: ({ 'topic-only': !__VLS_ctx.hasConsumerMetrics }) },
});
/** @type {__VLS_StyleScopedClasses['metric-kpis']} */ ;
/** @type {__VLS_StyleScopedClasses['topic-only']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.metricDisplay(__VLS_ctx.latestMeasurement?.producedDelta));
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
if (__VLS_ctx.hasConsumerMetrics) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.metricDisplay(__VLS_ctx.latestMeasurement?.consumedDelta));
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
}
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.metricDisplay(__VLS_ctx.latest?.endOffset));
if (__VLS_ctx.latest) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.latest.partitions);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
if (__VLS_ctx.hasConsumerMetrics) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        ...{ class: ({ warning: __VLS_ctx.latest !== undefined && __VLS_ctx.latest.lag > 0 }) },
    });
    /** @type {__VLS_StyleScopedClasses['warning']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.metricDisplay(__VLS_ctx.latest?.lag));
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.latest ? "剩余未消费消息" : "等待首次快照");
}
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
(__VLS_ctx.hasConsumerMetrics ? "生产与消费区间总数" : "Topic 生产区间总数");
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
(__VLS_ctx.hasConsumerMetrics ? "End Offset 与 Committed Offset" : "End Offset");
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
if (__VLS_ctx.hasConsumerMetrics) {
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
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "sampling-note" },
});
/** @type {__VLS_StyleScopedClasses['sampling-note']} */ ;
(__VLS_ctx.samplingLabel);
// @ts-ignore
[loadingOptions, monitoring, refreshing, refreshing, refreshing, stopMonitoring, clearSamples, samples, error, error, hasConsumerMetrics, hasConsumerMetrics, hasConsumerMetrics, hasConsumerMetrics, hasConsumerMetrics, hasConsumerMetrics, metricDisplay, metricDisplay, metricDisplay, metricDisplay, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, latestMeasurement, previousSnapshot, previousSnapshot, previousSnapshot, previousSnapshot, formatNumber, formatNumber, formatNumber, formatNumber, samplingLabel, samplingLabel, samplingLabel, samplingLabel, samplingLabel, latest, latest, latest, latest, latest, latest, latest, labels, labels, labels, throughputSeries, offsetSeries, lagSeries,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
