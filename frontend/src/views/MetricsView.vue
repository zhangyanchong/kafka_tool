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

const connection = useConnectionStore();
const topics = ref<KafkaTopic[]>([]);
const consumers = ref<KafkaConsumer[]>([]);
const selectedTopic = ref("");
const selectedGroup = ref("");
const samplingSeconds = ref(30);
const samples = ref<MetricPoint[]>([]);
const loadingOptions = ref(false);
const refreshing = ref(false);
const monitoring = ref(false);
const error = ref("");
let timer: number | undefined;

const latest = computed(() => samples.value[samples.value.length - 1]);
const measuredSamples = computed(() => samples.value.slice(1));
const latestMeasurement = computed(() => measuredSamples.value[measuredSamples.value.length - 1]);
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
  if (samplingSeconds.value < 60) return `${samplingSeconds.value} 秒`;
  return `${samplingSeconds.value / 60} 分钟`;
});

function formatNumber(value?: number) {
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
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "监控选项读取失败";
  } finally {
    loadingOptions.value = false;
  }
}

async function takeSnapshot() {
  if (!selectedTopic.value || !selectedGroup.value || refreshing.value) return false;
  refreshing.value = true;
  error.value = "";
  try {
    const snapshot = await fetchMetricSnapshot(
      connection.form,
      selectedTopic.value,
      selectedGroup.value,
    );
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
      consumedDelta = Math.max(0, snapshot.committedOffset - previous.committedOffset);
    }
    samples.value.push({ ...snapshot, producedDelta, consumedDelta, elapsedSeconds });
    samples.value = samples.value.slice(-21);
    return true;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "指标快照读取失败";
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
  if (!consumers.value.some((item) => item.groupId === selectedGroup.value)) {
    error.value = "请选择一个 Consumer Group";
    return;
  }
  if (timer) window.clearInterval(timer);
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
  if (timer) window.clearInterval(timer);
  timer = undefined;
  monitoring.value = false;
}

onMounted(loadOptions);
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <section class="list-page metrics-page">
    <div class="page-heading">
      <div>
        <span class="section-kicker">READ-ONLY METRICS</span>
        <h1>View</h1>
        <p>通过 Offset 快照观察 Topic 生产、消费组消费和积压趋势，不消费任何消息。</p>
      </div>
      <div class="read-only-badge"><i></i>只读监控</div>
    </div>

    <form class="metrics-filter" @submit.prevent="startMonitoring">
      <label class="topic-picker">
        <span>搜索并选择 Topic</span>
        <input v-model.trim="selectedTopic" list="metric-topics" placeholder="输入 Topic 名称搜索" :disabled="loadingOptions || monitoring" />
        <datalist id="metric-topics">
          <option v-for="topic in topics" :key="topic.name" :value="topic.name"></option>
        </datalist>
      </label>
      <label>
        <span>选择 Consumer Group</span>
        <select v-model="selectedGroup" :disabled="loadingOptions || monitoring">
          <option value="" disabled>请选择消费组</option>
          <option v-for="consumer in consumers" :key="consumer.groupId" :value="consumer.groupId">
            {{ consumer.groupId }}
          </option>
        </select>
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
      <button v-if="!monitoring" class="monitor-button" type="submit" :disabled="refreshing || loadingOptions">
        {{ refreshing ? "正在启动…" : "开始监控" }}
      </button>
      <div v-else class="monitor-controls">
        <span><i></i>{{ refreshing ? "正在采集…" : "监控中" }}</span>
        <button type="button" @click="stopMonitoring">停止监控</button>
      </div>
    </form>

    <div v-if="error" class="notice error metrics-error"><strong>读取失败</strong><span>{{ error }}</span></div>

    <div class="metric-kpis">
      <article>
        <span>TOPIC 本周期实际生成（非平均）</span>
        <strong>{{ formatNumber(latestMeasurement?.producedDelta) }}</strong>
        <small v-if="latestMeasurement && previousSnapshot">
          End {{ formatNumber(previousSnapshot.endOffset) }} → {{ formatNumber(latestMeasurement.endOffset) }}，间隔 {{ Math.round(latestMeasurement.elapsedSeconds) }} 秒
        </small>
        <small v-else>等待完成首个 {{ samplingLabel }} 周期</small>
      </article>
      <article>
        <span>消费组本周期实际提交（非平均）</span>
        <strong>{{ formatNumber(latestMeasurement?.consumedDelta) }}</strong>
        <small v-if="latestMeasurement && previousSnapshot">
          Committed {{ formatNumber(previousSnapshot.committedOffset) }} → {{ formatNumber(latestMeasurement.committedOffset) }}，间隔 {{ Math.round(latestMeasurement.elapsedSeconds) }} 秒
        </small>
        <small v-else>等待完成首个 {{ samplingLabel }} 周期</small>
      </article>
      <article>
        <span>END OFFSET</span>
        <strong>{{ formatNumber(latest?.endOffset) }}</strong>
        <small>{{ latest?.partitions || 0 }} 个分区合计</small>
      </article>
      <article :class="{ warning: (latest?.lag || 0) > 0 }">
        <span>CONSUMER LAG</span>
        <strong>{{ formatNumber(latest?.lag) }}</strong>
        <small>剩余未消费消息</small>
      </article>
    </div>

    <div class="chart-grid">
      <article class="chart-card">
        <header><div><strong>生产与消费区间总数</strong><span>每个点是前一个 {{ samplingLabel }} 内的实际 Offset 增量，不是平均值</span></div><small>不换算、不放大</small></header>
        <LineChart :labels="labels" :series="throughputSeries" />
      </article>
      <article class="chart-card">
        <header><div><strong>End Offset 与 Committed Offset</strong><span>所有分区 Offset 合计</span></div><small>每 {{ samplingLabel }} 采样</small></header>
        <LineChart :labels="labels" :series="offsetSeries" :zero-based="false" />
      </article>
      <article class="chart-card wide">
        <header><div><strong>Consumer Lag</strong><span>End Offset − Committed Offset，所有分区合计</span></div><small>独立 Lag 趋势</small></header>
        <LineChart :labels="labels" :series="lagSeries" />
      </article>
    </div>

    <p class="sampling-note">第一次快照只建立基线，完成一个完整的 {{ samplingLabel }} 周期后才产生真实增量。切换周期后请点击“开始监控”重新采样。</p>
  </section>
</template>
