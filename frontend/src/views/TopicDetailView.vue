<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { searchTopicMessages, type KafkaMessage } from "@/api/connections";
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
const fromTime = ref("");
const toTime = ref("");
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
const paginatedMessages = computed(() => {
  const start = (page.value - 1) * pageSize;
  return messages.value.slice(start, start + pageSize);
});

watch(() => messages.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page.value > lastPage) page.value = lastPage;
});

function toRFC3339(value: string) {
  return value ? new Date(value).toISOString() : "";
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
  } catch (reason) {
    messages.value = [];
    loadError.value = reason instanceof Error ? reason.message : "消息读取失败";
  } finally {
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
  fromTime.value = "";
  toTime.value = "";
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

    <form class="message-search-card" @submit.prevent="search">
      <label class="content-search">
        <span>内容或 Key</span>
        <div class="search-box wide">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input v-model="keyword" placeholder="输入关键字，匹配消息 Key 或内容" />
        </div>
      </label>
      <label>
        <span>开始时间（可选）</span>
        <input
          v-model="fromTime"
          type="datetime-local"
          name="message-search-from-time"
          autocomplete="off"
          aria-label="开始时间（可选）"
        />
      </label>
      <label>
        <span>结束时间（可选）</span>
        <input
          v-model="toTime"
          type="datetime-local"
          name="message-search-to-time"
          autocomplete="off"
          aria-label="结束时间（可选）"
        />
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
