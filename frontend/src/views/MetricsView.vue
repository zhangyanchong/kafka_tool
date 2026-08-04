<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LineChart from "@/components/LineChart.vue";
import {
  fetchMetricSnapshot,
  listConsumers,
  listTopics,
  type KafkaConsumer,
  type KafkaTopic,
  type MetricSnapshot,
} from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";

interface MetricPoint extends MetricSnapshot {
  producedDelta: number;
  consumedDelta: number;
  elapsedSeconds: number;
}

const MAX_METRIC_POINTS = 100;

const connection = useConnectionStore();
const topics = ref<KafkaTopic[]>([]);
const consumers = ref<KafkaConsumer[]>([]);
const selectedTopic = ref("");
const selectedGroup = ref("");
const monitoredGroup = ref("");
const samplingSeconds = ref(30);
const samples = ref<MetricPoint[]>([]);
const loadingOptions = ref(false);
const refreshing = ref(false);
const monitoring = ref(false);
const error = ref("");
const consumerOptionsError = ref("");
const topicPickerOpen = ref(false);
const consumerPickerOpen = ref(false);
let timer: number | undefined;
let monitoringRun = 0;
let disposed = false;

const latest = computed(() => samples.value[samples.value.length - 1]);
const measuredSamples = computed(() => samples.value.slice(1));
const latestMeasurement = computed(() => measuredSamples.value[measuredSamples.value.length - 1]);
const hasConsumerMetrics = computed(() =>
  Boolean(samples.value.length ? monitoredGroup.value : selectedGroup.value),
);
const sortedConsumers = computed(() =>
  [...consumers.value].sort((left, right) => {
    const rank = (state: string) => {
      const normalized = state.trim().toLowerCase();
      if (normalized === "stable") return 0;
      if (["preparingrebalance", "completingrebalance", "assigning", "reconciling"].includes(normalized)) return 1;
      if (!normalized) return 2;
      if (normalized === "empty") return 3;
      if (normalized === "dead") return 4;
      return 2;
    };
    return rank(left.state) - rank(right.state) || left.groupId.localeCompare(right.groupId);
  }),
);
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
    ? sortedConsumers.value.filter((item) =>
        item.groupId.toLocaleLowerCase().includes(keyword) ||
        item.state.toLocaleLowerCase().includes(keyword),
      )
    : sortedConsumers.value;
  return items.slice(0, 50);
});
const previousSnapshot = computed(() =>
  samples.value.length >= 2 ? samples.value[samples.value.length - 2] : undefined,
);
const labels = computed(() =>
  measuredSamples.value.map((item) =>
    new Date(item.timestamp).toLocaleTimeString("zh-CN", {
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    }),
  ),
);
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
  const series: Array<{ name: string; color: string; values: number[]; dash?: string }> = [
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
  if (samplingSeconds.value < 60) return `${samplingSeconds.value} 秒`;
  return `${samplingSeconds.value / 60} 分钟`;
});

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function metricDisplay(value?: number) {
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
    if (topicResult.status === "rejected") throw topicResult.reason;
    topics.value = topicResult.value.items;
    if (consumerResult.status === "fulfilled") {
      consumers.value = consumerResult.value.items;
    } else {
      consumers.value = [];
      consumerOptionsError.value = "消费组列表不可用，仍可仅监控 Topic";
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "监控选项读取失败";
  } finally {
    loadingOptions.value = false;
  }
}

async function takeSnapshot(run: number) {
  if (!selectedTopic.value || refreshing.value) return false;
  refreshing.value = true;
  error.value = "";
  try {
    const snapshot = await fetchMetricSnapshot(
      connection.form,
      selectedTopic.value,
      monitoredGroup.value,
    );
    if (disposed || run !== monitoringRun || !monitoring.value) return false;
    const previous = samples.value[samples.value.length - 1];
    let producedDelta = 0;
    let consumedDelta = 0;
    let elapsedSeconds = 0;
    if (previous) {
      elapsedSeconds = Math.max(
        1,
        (new Date(snapshot.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000,
      );
      producedDelta = Math.max(0, snapshot.endOffset - previous.endOffset);
      if (snapshot.hasConsumer && previous.hasConsumer) {
        consumedDelta = Math.max(0, snapshot.committedOffset - previous.committedOffset);
      }
    }
    samples.value.push({ ...snapshot, producedDelta, consumedDelta, elapsedSeconds });
    // Keep one extra baseline snapshot so the chart can show exactly 100
    // correctly calculated interval points.
    samples.value = samples.value.slice(-(MAX_METRIC_POINTS + 1));
    return true;
  } catch (reason) {
    if (!disposed && run === monitoringRun) {
      error.value = reason instanceof Error ? reason.message : "指标快照读取失败";
    }
    return false;
  } finally {
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
  if (timer) window.clearInterval(timer);
  const run = ++monitoringRun;
  samples.value = [];
  monitoredGroup.value = selectedGroup.value;
  monitoring.value = true;
  const started = await takeSnapshot(run);
  if (disposed || run !== monitoringRun) return;
  if (!started) {
    monitoring.value = false;
    return;
  }
  timer = window.setInterval(() => {
    void takeSnapshot(run);
  }, samplingSeconds.value * 1000);
}

function stopMonitoring() {
  monitoringRun += 1;
  if (timer) window.clearInterval(timer);
  timer = undefined;
  monitoring.value = false;
}

function clearSamples() {
  samples.value = [];
}

function selectTopic(name: string) {
  selectedTopic.value = name;
  topicPickerOpen.value = false;
}

function closeTopicPicker() {
  window.setTimeout(() => {
    topicPickerOpen.value = false;
  }, 100);
}

function selectConsumer(groupId: string) {
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
  disposed = true;
  stopMonitoring();
});
</script>

<template>
  <section class="list-page metrics-page">
    <div class="page-heading">
      <div>
        <span class="section-kicker">READ-ONLY METRICS</span>
        <h1>监控</h1>
        <p>通过 Offset 快照观察 Topic 生产、消费组消费和积压趋势，不消费任何消息。</p>
      </div>
      <div class="read-only-badge"><i></i>只读监控</div>
    </div>

    <form class="metrics-filter" @submit.prevent="startMonitoring">
      <label class="topic-picker">
        <span>搜索并选择 Topic</span>
        <input
          v-model="selectedTopic"
          placeholder="输入 Topic 名称搜索"
          autocomplete="off"
          :disabled="loadingOptions || monitoring"
          @focus="topicPickerOpen = true"
          @input="topicPickerOpen = true"
          @blur="closeTopicPicker"
        />
        <div v-if="topicPickerOpen && !loadingOptions && !monitoring" class="topic-options">
          <button
            v-for="topic in filteredTopics"
            :key="topic.name"
            type="button"
            :class="{ active: topic.name === selectedTopic }"
            @mousedown.prevent="selectTopic(topic.name)"
          >
            {{ topic.name }}
          </button>
          <small v-if="filteredTopics.length === 0">没有匹配的 Topic</small>
          <small v-else-if="filteredTopics.length === 50">最多显示前 50 个匹配结果，请继续输入缩小范围</small>
        </div>
      </label>
      <label class="consumer-picker">
        <span>Consumer Group（可选）</span>
        <input
          v-model="selectedGroup"
          :placeholder="consumerOptionsError || '输入消费组名称搜索；留空则仅监控 Topic'"
          autocomplete="off"
          :disabled="loadingOptions || monitoring || Boolean(consumerOptionsError)"
          @focus="consumerPickerOpen = true"
          @input="consumerPickerOpen = true"
          @blur="closeConsumerPicker"
        />
        <div v-if="consumerPickerOpen && !loadingOptions && !monitoring && !consumerOptionsError" class="topic-options consumer-options">
          <button type="button" :class="{ active: !selectedGroup }" @mousedown.prevent="selectConsumer('')">
            不选择，仅监控 Topic
          </button>
          <button
            v-for="consumer in filteredConsumers"
            :key="consumer.groupId"
            type="button"
            :class="{ active: consumer.groupId === selectedGroup }"
            @mousedown.prevent="selectConsumer(consumer.groupId)"
          >
            <b>{{ consumer.groupId }}</b><em v-if="consumer.state">{{ consumer.state }}</em>
          </button>
          <small v-if="filteredConsumers.length === 0">没有匹配的 Consumer Group</small>
          <small v-else-if="filteredConsumers.length === 50">最多显示前 50 个匹配结果，请继续输入缩小范围</small>
        </div>
      </label>
      <div class="period-picker">
        <span>真实采样周期</span>
        <div>
          <button
            v-for="period in [{ seconds: 30, label: '30 秒' }, { seconds: 60, label: '1 分钟' }, { seconds: 120, label: '2 分钟' }, { seconds: 300, label: '5 分钟' }]"
            :key="period.seconds"
            type="button"
            :class="{ active: samplingSeconds === period.seconds }"
            :disabled="monitoring"
            @click="samplingSeconds = period.seconds"
          >
            {{ period.label }}
          </button>
        </div>
      </div>
      <div class="metrics-actions">
        <button v-if="!monitoring" class="monitor-button" type="submit" :disabled="refreshing || loadingOptions">
          {{ refreshing ? "正在启动…" : "开始监控" }}
        </button>
        <div v-else class="monitor-controls">
          <span><i></i>{{ refreshing ? "正在采集…" : "监控中" }}</span>
          <button type="button" @click="stopMonitoring">停止监控</button>
        </div>
        <button class="clear-chart-button" type="button" :disabled="samples.length === 0" @click="clearSamples">
          清空图表
        </button>
      </div>
    </form>

    <div v-if="error" class="notice error metrics-error"><strong>读取失败</strong><span>{{ error }}</span></div>

    <div class="metric-kpis" :class="{ 'topic-only': !hasConsumerMetrics }">
      <article>
        <span>TOPIC 本周期实际生成（非平均）</span>
        <strong>{{ metricDisplay(latestMeasurement?.producedDelta) }}</strong>
        <small v-if="latestMeasurement && previousSnapshot">
          End {{ formatNumber(previousSnapshot.endOffset) }} → {{ formatNumber(latestMeasurement.endOffset) }}，间隔 {{ Math.round(latestMeasurement.elapsedSeconds) }} 秒
        </small>
        <small v-else>等待完成首个 {{ samplingLabel }} 周期</small>
      </article>
      <article v-if="hasConsumerMetrics">
        <span>消费组本周期实际提交（非平均）</span>
        <strong>{{ metricDisplay(latestMeasurement?.consumedDelta) }}</strong>
        <small v-if="latestMeasurement && previousSnapshot">
          Committed {{ formatNumber(previousSnapshot.committedOffset) }} → {{ formatNumber(latestMeasurement.committedOffset) }}，间隔 {{ Math.round(latestMeasurement.elapsedSeconds) }} 秒
        </small>
        <small v-else>等待完成首个 {{ samplingLabel }} 周期</small>
      </article>
      <article>
        <span>END OFFSET</span>
        <strong>{{ metricDisplay(latest?.endOffset) }}</strong>
        <small v-if="latest">{{ latest.partitions }} 个分区合计</small>
        <small v-else>等待首次快照</small>
      </article>
      <article v-if="hasConsumerMetrics" :class="{ warning: latest !== undefined && latest.lag > 0 }">
        <span>CONSUMER LAG</span>
        <strong>{{ metricDisplay(latest?.lag) }}</strong>
        <small>{{ latest ? "剩余未消费消息" : "等待首次快照" }}</small>
      </article>
    </div>

    <div class="chart-grid">
      <article class="chart-card">
        <header><div><strong>{{ hasConsumerMetrics ? "生产与消费区间总数" : "Topic 生产区间总数" }}</strong><span>每个点是前一个 {{ samplingLabel }} 内的实际 Offset 增量，不是平均值</span></div><small>不换算、不放大</small></header>
        <LineChart :labels="labels" :series="throughputSeries" />
      </article>
      <article class="chart-card">
        <header><div><strong>{{ hasConsumerMetrics ? "End Offset 与 Committed Offset" : "End Offset" }}</strong><span>所有分区 Offset 合计</span></div><small>每 {{ samplingLabel }} 采样</small></header>
        <LineChart :labels="labels" :series="offsetSeries" :zero-based="false" />
      </article>
      <article v-if="hasConsumerMetrics" class="chart-card wide">
        <header><div><strong>Consumer Lag</strong><span>End Offset − Committed Offset，所有分区合计</span></div><small>独立 Lag 趋势</small></header>
        <LineChart :labels="labels" :series="lagSeries" />
      </article>
    </div>

    <p class="sampling-note">第一次快照只建立基线，完成一个完整的 {{ samplingLabel }} 周期后才产生真实增量。图表最多保留最近 100 个有效采样点；切换周期后请点击“开始监控”重新采样。</p>
  </section>
</template>
