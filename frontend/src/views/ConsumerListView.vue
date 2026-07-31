<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listConsumers } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";

interface ConsumerRow {
  groupId: string;
  state: string;
  members: number;
  topics: number;
  lag: number;
  consumePerMinute: number;
}

const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const consumers = ref<ConsumerRow[]>([]);
const loading = ref(false);
const loadError = ref("");
const connection = useConnectionStore();
const router = useRouter();
const filteredConsumers = computed(() =>
  consumers.value.filter((consumer) =>
    consumer.groupId.toLowerCase().includes(keyword.value.toLowerCase()),
  ),
);
const paginatedConsumers = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredConsumers.value.slice(start, start + pageSize);
});

watch(keyword, () => { page.value = 1; });
watch(() => filteredConsumers.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page.value > lastPage) page.value = lastPage;
});

async function loadConsumers() {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await listConsumers(connection.form);
    consumers.value = response.items.map((consumer) => ({
      groupId: consumer.groupId,
      state: consumer.state || "Unknown",
      members: 0,
      topics: 0,
      lag: 0,
      consumePerMinute: 0,
    }));
  } catch (reason) {
    loadError.value = reason instanceof Error ? reason.message : "Consumer 读取失败";
  } finally {
    loading.value = false;
  }
}

onMounted(loadConsumers);

function openConsumer(groupId: string) {
  router.push({ name: "consumer-detail", params: { groupId } });
}
</script>

<template>
  <section class="list-page">
    <div class="page-heading">
      <div>
        <span class="section-kicker">CONSUMPTION</span>
        <h1>Consumers</h1>
        <p>查看消费组状态、成员数量、消费速度和消息积压。</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadConsumers">
        <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5" /></svg>
        {{ loading ? "读取中…" : "刷新" }}
      </button>
    </div>

    <div class="summary-grid">
      <article><span>消费组</span><strong>{{ consumers.length }}</strong><small>当前集群</small></article>
      <article><span>活跃成员</span><strong>—</strong><small>所有 Consumer</small></article>
      <article><span>总积压</span><strong>—</strong><small>条消息</small></article>
    </div>

    <div class="data-card">
      <div class="table-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input v-model="keyword" placeholder="搜索 Consumer Group" />
        </div>
        <span>{{ filteredConsumers.length }} 个消费组</span>
      </div>

      <table v-if="filteredConsumers.length">
        <thead><tr><th>Consumer Group</th><th>状态</th><th>成员</th><th>Topic</th><th>消费速率</th><th>Lag</th></tr></thead>
        <tbody>
          <tr
            v-for="consumer in paginatedConsumers"
            :key="consumer.groupId"
            class="clickable-row"
            tabindex="0"
            @click="openConsumer(consumer.groupId)"
            @keydown.enter="openConsumer(consumer.groupId)"
          >
            <td><strong>{{ consumer.groupId }}</strong><span class="row-arrow">→</span></td>
            <td><span class="row-status">{{ consumer.state }}</span></td>
            <td>{{ consumer.members }}</td>
            <td>{{ consumer.topics }}</td>
            <td>{{ consumer.consumePerMinute.toLocaleString() }} / min</td>
            <td>{{ consumer.lag.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon consumer">
          <svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="10" r="2.5" /><path d="M3.5 19c.3-3 1.8-4.5 4.5-4.5s4.2 1.5 4.5 4.5M13 18.5c.3-2.4 1.4-3.6 3.5-3.6 2.2 0 3.4 1.2 3.7 3.6" /></svg>
        </div>
        <strong>{{ loading ? "正在读取 Consumer" : loadError ? "Consumer 读取失败" : "没有找到 Consumer" }}</strong>
        <p>{{ loadError || (loading ? "正在从 Kafka 集群获取完整列表…" : "当前集群没有可显示的消费组。") }}</p>
      </div>
      <AppPagination
        v-model:page="page"
        :page-size="pageSize"
        :total="filteredConsumers.length"
      />
    </div>
  </section>
</template>
