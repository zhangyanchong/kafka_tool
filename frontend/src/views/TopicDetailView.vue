<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  fetchTopicHealth,
  searchTopicMessages,
  type KafkaMessage,
  type TopicHealth,
  type TopicHealthIssue,
} from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
import AppPagination from "@/components/AppPagination.vue";

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          ExportFile?: (defaultFilename: string, content: string) => Promise<boolean>;
        };
      };
    };
  }
}

const route = useRoute();
const connection = useConnectionStore();
const topic = computed(() => String(route.params.topic || ""));
const messages = ref<KafkaMessage[]>([]);
const fromDate = ref("");
const fromClock = ref("00:00");
const toDate = ref("");
const toClock = ref("23:59");
const keyword = ref("");
const limit = ref(20);
const scanLimit = ref(10000);
const loading = ref(false);
const loadError = ref("");
const scanned = ref(0);
const truncated = ref(false);
const expanded = ref<Set<string>>(new Set());
const page = ref(1);
const pageSize = 10;
const copied = ref("");
const topicHealth = ref<TopicHealth | null>(null);
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
  if (page.value > lastPage) page.value = lastPage;
});
watch(showAllPartitions, () => {
  healthPage.value = 1;
});
watch(() => visibleHealthPartitions.value.length, () => {
  const lastPage = Math.max(1, Math.ceil(visibleHealthPartitions.value.length / healthPageSize));
  if (healthPage.value > lastPage) healthPage.value = lastPage;
});

const healthIssueLabels: Record<TopicHealthIssue, string> = {
  partition_error: "Metadata 错误",
  leader_unavailable: "Leader 不可用",
  under_replicated: "ISR 副本不足",
  offline_replicas: "存在离线副本",
};

function toRFC3339(date: string, clock: string, fallbackClock: string) {
  if (!date) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`日期格式必须是 YYYY-MM-DD，例如 2026-07-02：${date}`);
  }
  const value = new Date(`${date}T${clock || fallbackClock}:00`);
  const [year, month, day] = date.split("-").map(Number);
  if (
    Number.isNaN(value.getTime()) ||
    value.getFullYear() !== year ||
    value.getMonth() + 1 !== month ||
    value.getDate() !== day
  ) {
    throw new Error(`日期不存在或格式不正确：${date}`);
  }
  return value.toISOString();
}

function normalizeDateInput(value: string) {
  const normalized = value.trim().replace(/[/.]/g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return normalized;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function preview(value: string) {
  return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}

function messageId(message: KafkaMessage) {
  return `${message.partition}-${message.offset}`;
}

function healthMetric(value?: number) {
  if (value !== undefined) return value.toLocaleString();
  return healthLoading.value ? "读取中" : "不可用";
}

function brokerList(values: number[]) {
  return values.length ? values.join(", ") : "无";
}

async function loadTopicHealth() {
  if (healthLoading.value) return;
  healthLoading.value = true;
  healthError.value = "";
  try {
    topicHealth.value = await fetchTopicHealth(topic.value, connection.form);
  } catch (reason) {
    topicHealth.value = null;
    healthError.value = reason instanceof Error ? reason.message : "Topic 健康状态读取失败";
  } finally {
    healthLoading.value = false;
  }
}

function toggleMessage(message: KafkaMessage) {
  const next = new Set(expanded.value);
  const id = messageId(message);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

async function copyText(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
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
    if (copied.value === id) copied.value = "";
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
  } catch (reason) {
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
  } catch (reason) {
    messages.value = [];
    loadError.value = reason instanceof Error ? reason.message : "消息读取失败";
  } finally {
    loading.value = false;
  }
}

function resetSearch() {
  fromDate.value = "";
  fromClock.value = "00:00";
  toDate.value = "";
  toClock.value = "23:59";
  keyword.value = "";
  limit.value = 20;
  scanLimit.value = 10000;
  search();
}

async function exportMessages() {
  if (!messages.value.length) return;
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
    } catch (reason) {
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
  fromDate.value = "";
  fromClock.value = "00:00";
  toDate.value = "";
  toClock.value = "23:59";
  loadTopicHealth();
  search();
});
</script>

<template>
  <section class="list-page">
    <RouterLink class="back-link" to="/dashboard/topics">← 返回 Topic 列表</RouterLink>
    <div class="page-heading detail-heading">
      <div>
        <span class="section-kicker">MESSAGE EXPLORER</span>
        <h1>{{ topic }}</h1>
        <p>按时间和内容检索消息。默认展示最新 20 条，不会提交消费 Offset。</p>
      </div>
    </div>

    <div class="summary-grid topic-health-summary">
      <article><span>分区总数</span><strong>{{ healthMetric(topicHealth?.partitions) }}</strong><small>Metadata 中的 Partition</small></article>
      <article><span>正常分区</span><strong>{{ healthMetric(topicHealth?.healthyPartitions) }}</strong><small>Leader 与副本同步正常</small></article>
      <article :class="{ warning: (topicHealth?.problemPartitions || 0) > 0 }"><span>异常分区</span><strong>{{ healthMetric(topicHealth?.problemPartitions) }}</strong><small>至少存在一项异常</small></article>
      <article :class="{ warning: (topicHealth?.noLeaderPartitions || 0) > 0 }"><span>无 Leader</span><strong>{{ healthMetric(topicHealth?.noLeaderPartitions) }}</strong><small>Leader 当前不可用</small></article>
    </div>

    <div class="data-card topic-health-card" :class="{ problem: (topicHealth?.problemPartitions || 0) > 0 }">
      <div class="table-toolbar topic-health-toolbar">
        <div>
          <strong>分区健康状态</strong>
          <small>单 Topic Metadata，只读查询</small>
        </div>
        <div class="topic-health-actions">
          <span v-if="healthLoading">读取中…</span>
          <span v-else-if="healthError">读取失败</span>
          <span v-else-if="topicHealth?.problemPartitions" class="health-problem">
            发现 {{ topicHealth.problemPartitions }} 个异常分区
          </span>
          <span v-else class="health-ok">全部分区正常</span>
          <button type="button" :disabled="healthLoading" @click="loadTopicHealth">刷新</button>
          <button type="button" :aria-expanded="!healthCollapsed" @click="healthCollapsed = !healthCollapsed">
            {{ healthCollapsed ? "展开" : "收起" }}
          </button>
        </div>
      </div>

      <template v-if="!healthCollapsed">
        <div class="health-filter-bar">
          <div>
            <button type="button" :class="{ active: !showAllPartitions }" @click="showAllPartitions = false">只看异常</button>
            <button type="button" :class="{ active: showAllPartitions }" @click="showAllPartitions = true">全部分区</button>
          </div>
          <span>{{ visibleHealthPartitions.length }} 个分区</span>
        </div>

        <div v-if="healthError" class="member-empty">
          <strong>健康状态读取失败</strong>
          <p>{{ healthError }}</p>
        </div>

        <table v-else-if="paginatedHealthPartitions.length">
          <thead>
            <tr>
              <th>Partition</th>
              <th>Leader</th>
              <th>Replicas</th>
              <th>ISR</th>
              <th>Offline Replicas</th>
              <th>诊断</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="partition in paginatedHealthPartitions" :key="partition.partition" :class="{ 'health-problem-row': !partition.healthy }">
              <td><span class="partition-tag">P{{ partition.partition }}</span></td>
              <td>
                <strong v-if="partition.leader >= 0">Broker {{ partition.leader }}</strong>
                <span v-else class="health-problem">不可用</span>
              </td>
              <td>{{ brokerList(partition.replicas) }}</td>
              <td>{{ brokerList(partition.isr) }}</td>
              <td>{{ brokerList(partition.offlineReplicas) }}</td>
              <td>
                <span v-if="partition.healthy" class="health-status healthy">正常</span>
                <div v-else class="health-issues">
                  <span v-for="issue in partition.issues" :key="issue">{{ healthIssueLabels[issue] }}</span>
                  <small v-if="partition.errorMessage">{{ partition.errorMessage }}</small>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else-if="!healthLoading" class="member-empty">
          <strong>{{ showAllPartitions ? "没有分区 Metadata" : "没有异常分区" }}</strong>
          <p>{{ showAllPartitions ? "Kafka 没有返回可展示的分区信息。" : "当前 Topic 的 Leader、ISR 和副本状态正常。" }}</p>
        </div>

        <AppPagination
          v-if="visibleHealthPartitions.length > healthPageSize"
          v-model:page="healthPage"
          :page-size="healthPageSize"
          :total="visibleHealthPartitions.length"
        />
      </template>
    </div>

    <form class="message-search-card" @submit.prevent="search">
      <label class="content-search">
        <span>内容或 Key</span>
        <div class="search-box wide">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input v-model="keyword" placeholder="输入关键字，匹配消息 Key 或内容" />
        </div>
      </label>
      <label class="datetime-label">
        <span>开始时间（可选）</span>
        <div class="datetime-fields">
          <input
            v-model="fromDate"
            type="text"
            name="message-search-from-date"
            autocomplete="off"
            inputmode="numeric"
            placeholder="2026-07-02"
            aria-label="开始日期（可选）"
            @blur="fromDate = normalizeDateInput(fromDate)"
          />
          <i>-</i>
          <input
            v-model="fromClock"
            type="time"
            name="message-search-from-clock"
            step="60"
            aria-label="开始时分"
          />
        </div>
      </label>
      <label class="datetime-label end-datetime-label">
        <span>结束时间（可选）</span>
        <div class="datetime-fields">
          <input
            v-model="toDate"
            type="text"
            name="message-search-to-date"
            autocomplete="off"
            inputmode="numeric"
            placeholder="2026-07-02"
            aria-label="结束日期（可选）"
            @blur="toDate = normalizeDateInput(toDate)"
          />
          <i>-</i>
          <input
            v-model="toClock"
            type="time"
            name="message-search-to-clock"
            step="60"
            aria-label="结束时分"
          />
        </div>
      </label>
      <label>
        <span>最多返回</span>
        <select v-model.number="limit">
          <option :value="20">20 条</option>
          <option :value="100">100 条</option>
          <option :value="1000">1,000 条</option>
          <option :value="10000">10,000 条</option>
        </select>
      </label>
      <label>
        <span>最大查询条数（1～100万）</span>
        <input
          v-model.number="scanLimit"
          type="number"
          min="1"
          max="1000000"
          step="1"
          inputmode="numeric"
          required
          placeholder="默认 10000，最多 1000000"
        />
      </label>
      <div class="message-search-actions">
        <button type="button" class="export-button" :disabled="loading || !messages.length" @click="exportMessages">
          导出结果
        </button>
        <button type="button" class="clear-button" :disabled="loading" @click="resetSearch">重置</button>
        <button type="submit" class="search-button" :disabled="loading">
          {{ loading ? "搜索中…" : "搜索消息" }}
        </button>
      </div>
    </form>

    <div class="search-meta">
      <span>返回 <strong>{{ messages.length }}</strong> 条</span>
      <span>每页 <strong>{{ pageSize }}</strong> 条</span>
      <span>已扫描 <strong>{{ scanned.toLocaleString() }}</strong> 条</span>
      <span v-if="truncated" class="scan-warning">已达到 {{ scanLimit.toLocaleString() }} 条查询上限，请缩小时间范围或提高上限</span>
    </div>

    <div v-if="loadError" class="notice error message-error">
      <strong>读取失败</strong><span>{{ loadError }}</span>
    </div>

    <div v-if="messages.length" class="message-list">
      <article
        v-for="message in paginatedMessages"
        :key="messageId(message)"
        class="message-card"
        @click="toggleMessage(message)"
      >
        <header>
          <div>
            <span class="partition-tag">P{{ message.partition }}</span>
            <span class="offset-label">OFFSET {{ message.offset.toLocaleString() }}</span>
          </div>
          <div>
            <time>{{ formatTime(message.timestamp) }}</time>
            <span>{{ formatBytes(message.size) }}</span>
          </div>
        </header>
        <div v-if="message.key" class="message-key">
          <b>KEY</b>
          <code @click.stop>{{ message.key }}</code>
          <button type="button" @click.stop="copyText(message.key, `key-${messageId(message)}`)">
            {{ copied === `key-${messageId(message)}` ? "已复制" : "复制 Key" }}
          </button>
        </div>
        <div class="message-content">
          <pre @click.stop>{{ expanded.has(messageId(message)) ? message.value : preview(message.value) }}</pre>
          <button type="button" @click.stop="copyText(message.value, `value-${messageId(message)}`)">
            {{ copied === `value-${messageId(message)}` ? "已复制" : "复制内容" }}
          </button>
        </div>
        <footer v-if="message.value.length > 240">
          {{ expanded.has(messageId(message)) ? "收起内容" : "展开完整内容" }}
        </footer>
      </article>
      <AppPagination
        v-model:page="page"
        :page-size="pageSize"
        :total="messages.length"
      />
    </div>

    <div v-else-if="!loading && !loadError" class="data-card">
      <div class="empty-state message-empty">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24"><path d="M5 7h14v10H5zM8 4h8M8 20h8" /><path d="M9 11h6M9 14h4" /></svg>
        </div>
        <strong>没有找到消息</strong>
        <p>可以调整时间范围、搜索内容或返回数量后再次搜索。</p>
      </div>
    </div>

    <div v-if="loading" class="data-card">
      <div class="empty-state message-empty">
        <div class="loading-ring"></div>
        <strong>正在读取 Kafka 消息</strong>
        <p>内容搜索需要顺序扫描消息，较大的时间范围可能需要几秒钟。</p>
      </div>
    </div>
  </section>
</template>
