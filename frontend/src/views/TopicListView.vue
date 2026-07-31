<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listTopics } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";

interface TopicRow {
  name: string;
  partitions: number;
  internal: boolean;
  status: "正常" | "异常";
}

const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const topics = ref<TopicRow[]>([]);
const loading = ref(false);
const loadError = ref("");
const connection = useConnectionStore();
const router = useRouter();
const filteredTopics = computed(() =>
  topics.value.filter((topic) =>
    topic.name.toLowerCase().includes(keyword.value.toLowerCase()),
  ),
);
const paginatedTopics = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredTopics.value.slice(start, start + pageSize);
});
const internalTopicCount = computed(() =>
  topics.value.filter((topic) => topic.internal).length,
);

watch(keyword, () => { page.value = 1; });
watch(() => filteredTopics.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page.value > lastPage) page.value = lastPage;
});

async function loadTopics() {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await listTopics(connection.form);
    topics.value = response.items.map((topic) => ({
      name: topic.name,
      partitions: topic.partitions,
      internal: topic.internal,
      status: "正常",
    }));
  } catch (reason) {
    loadError.value = reason instanceof Error ? reason.message : "Topic 读取失败";
  } finally {
    loading.value = false;
  }
}

onMounted(loadTopics);

function openTopic(topic: string) {
  router.push({ name: "topic-detail", params: { topic } });
}
</script>

<template>
  <section class="list-page">
    <div class="page-heading">
      <div>
        <span class="section-kicker">STREAMS</span>
        <h1>Topics</h1>
        <p>查看当前集群中的 Topic、分区数量和消息生产速率。</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadTopics">
        <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5" /></svg>
        {{ loading ? "读取中…" : "刷新" }}
      </button>
    </div>

    <div class="summary-grid">
      <article><span>TOPIC 总数</span><strong>{{ topics.length }}</strong><small>当前集群</small></article>
      <article><span>分区总数</span><strong>—</strong><small>全部 Topic</small></article>
      <article><span>内部 Topic</span><strong>{{ internalTopicCount }}</strong><small>Kafka 系统 Topic</small></article>
    </div>

    <div class="data-card">
      <div class="table-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input v-model="keyword" placeholder="搜索 Topic 名称" />
        </div>
        <span>{{ filteredTopics.length }} 个 Topic</span>
      </div>

      <table v-if="filteredTopics.length">
        <thead><tr><th>Topic 名称</th><th>分区</th><th>类型</th><th>状态</th></tr></thead>
        <tbody>
          <tr
            v-for="topic in paginatedTopics"
            :key="topic.name"
            class="clickable-row"
            tabindex="0"
            @click="openTopic(topic.name)"
            @keydown.enter="openTopic(topic.name)"
          >
            <td><strong>{{ topic.name }}</strong><span class="row-arrow">→</span></td>
            <td>{{ topic.partitions }}</td>
            <td>{{ topic.internal ? "内部" : "业务" }}</td>
            <td><span class="row-status">{{ topic.status }}</span></td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24"><path d="M5 7h14v10H5zM8 4h8M8 20h8" /><path d="M9 11h6M9 14h4" /></svg>
        </div>
        <strong>{{ loading ? "正在读取 Topic" : loadError ? "Topic 读取失败" : "没有找到 Topic" }}</strong>
        <p>{{ loadError || (loading ? "正在从 Kafka 集群获取完整列表…" : "当前集群没有可显示的 Topic。") }}</p>
      </div>
      <AppPagination
        v-model:page="page"
        :page-size="pageSize"
        :total="filteredTopics.length"
      />
    </div>
  </section>
</template>
