<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listConsumers, type KafkaConsumer } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";

const keyword = ref("");
const statusFilter = ref<"all" | "active" | "idle">("all");
const page = ref(1);
const pageSize = 10;
const consumers = ref<KafkaConsumer[]>([]);
const loading = ref(false);
const loadError = ref("");
const connection = useConnectionStore();
const router = useRouter();

function normalizedState(consumer: KafkaConsumer) {
  return consumer.state.trim().toLowerCase();
}

function isIdleConsumer(consumer: KafkaConsumer) {
  const state = normalizedState(consumer);
  return state === "empty" || state === "dead";
}

function isActiveConsumer(consumer: KafkaConsumer) {
  const state = normalizedState(consumer);
  return [
    "stable",
    "preparingrebalance",
    "completingrebalance",
    "assigning",
    "reconciling",
  ].includes(state);
}

function consumerStateRank(consumer: KafkaConsumer) {
  const state = normalizedState(consumer);
  if (state === "stable") return 0;
  if (isActiveConsumer(consumer)) return 1;
  if (!state) return 2;
  if (state === "empty") return 3;
  return 4;
}

const filteredConsumers = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  return consumers.value
    .filter((consumer) => {
      if (search && !consumer.groupId.toLowerCase().includes(search)) return false;
      if (statusFilter.value === "active") return isActiveConsumer(consumer);
      if (statusFilter.value === "idle") return isIdleConsumer(consumer);
      return true;
    })
    .sort((left, right) =>
      consumerStateRank(left) - consumerStateRank(right) ||
      left.groupId.localeCompare(right.groupId),
    );
});
const paginatedConsumers = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredConsumers.value.slice(start, start + pageSize);
});
const stableConsumerCount = computed(() =>
  consumers.value.filter((consumer) => consumer.state.toLowerCase() === "stable").length,
);
const emptyConsumerCount = computed(() =>
  consumers.value.filter((consumer) => consumer.state.toLowerCase() === "empty").length,
);

watch([keyword, statusFilter], () => { page.value = 1; });
watch(() => filteredConsumers.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page.value > lastPage) page.value = lastPage;
});

async function loadConsumers() {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await listConsumers(connection.form);
    consumers.value = response.items;
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
        <p>查看消费组及 Kafka 当前报告的状态和协议。</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadConsumers">
        <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5" /></svg>
        {{ loading ? "读取中…" : "刷新" }}
      </button>
    </div>

    <div class="summary-grid">
      <article><span>消费组</span><strong>{{ consumers.length }}</strong><small>当前集群</small></article>
      <article><span>STABLE</span><strong>{{ stableConsumerCount }}</strong><small>稳定消费组</small></article>
      <article><span>EMPTY</span><strong>{{ emptyConsumerCount }}</strong><small>无活跃成员的消费组</small></article>
    </div>

    <div class="data-card">
      <div class="table-toolbar">
        <div class="consumer-toolbar-controls">
          <div class="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input v-model="keyword" placeholder="搜索 Consumer Group" />
          </div>
          <select v-model="statusFilter" class="consumer-status-filter" aria-label="按消费组状态筛选">
            <option value="all">全部状态</option>
            <option value="active">仅看活跃</option>
            <option value="idle">仅看空闲</option>
          </select>
        </div>
        <span>{{ filteredConsumers.length }} 个消费组</span>
      </div>

      <table v-if="filteredConsumers.length">
        <thead><tr><th>Consumer Group</th><th>状态</th><th>协议类型</th><th>Group 类型</th></tr></thead>
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
            <td>
              <span class="row-status" :class="{ inactive: isIdleConsumer(consumer) }">
                {{ consumer.state || "未报告" }}
              </span>
            </td>
            <td>{{ consumer.protocolType || "未报告" }}</td>
            <td>{{ consumer.groupType || "未报告" }}</td>
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
