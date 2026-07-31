<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listConsumerPartitions, type ConsumerPartition } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";

const route = useRoute();
const connection = useConnectionStore();
const groupId = computed(() => String(route.params.groupId || ""));
const partitions = ref<ConsumerPartition[]>([]);
const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const loading = ref(false);
const loadError = ref("");

const filteredPartitions = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  if (!search) return partitions.value;
  return partitions.value.filter((item) =>
    item.topic.toLowerCase().includes(search) ||
    String(item.partition) === search,
  );
});
const paginatedPartitions = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredPartitions.value.slice(start, start + pageSize);
});
const topicCount = computed(() => new Set(partitions.value.map((item) => item.topic)).size);
const totalLag = computed(() => partitions.value.reduce((sum, item) => sum + item.lag, 0));

watch(keyword, () => { page.value = 1; });
watch(() => filteredPartitions.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page.value > lastPage) page.value = lastPage;
});

async function loadPartitions() {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await listConsumerPartitions(groupId.value, connection.form);
    partitions.value = response.items;
  } catch (reason) {
    loadError.value = reason instanceof Error ? reason.message : "分区消费进度读取失败";
  } finally {
    loading.value = false;
  }
}

onMounted(loadPartitions);
</script>

<template>
  <section class="list-page">
    <RouterLink class="back-link" to="/dashboard/consumers">← 返回 Consumer 列表</RouterLink>
    <div class="page-heading detail-heading">
      <div>
        <span class="section-kicker">CONSUMER GROUP</span>
        <h1>{{ groupId }}</h1>
        <p>查看该消费组在每个 Topic 分区上的提交位置和剩余消息。</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadPartitions">
        <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5" /></svg>
        {{ loading ? "读取中…" : "刷新" }}
      </button>
    </div>

    <div class="summary-grid">
      <article><span>消费 Topic</span><strong>{{ topicCount }}</strong><small>个 Topic</small></article>
      <article><span>消费分区</span><strong>{{ partitions.length }}</strong><small>个 Partition</small></article>
      <article><span>总剩余量</span><strong>{{ totalLag.toLocaleString() }}</strong><small>条消息 Lag</small></article>
    </div>

    <div class="data-card">
      <div class="table-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input v-model="keyword" placeholder="搜索 Topic 或分区编号" />
        </div>
        <span>{{ filteredPartitions.length }} 个分区</span>
      </div>

      <table v-if="filteredPartitions.length">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Partition</th>
            <th>开始 Offset</th>
            <th>当前 Offset</th>
            <th>结束 Offset</th>
            <th>剩余 Lag</th>
            <th>消费进度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedPartitions" :key="`${item.topic}-${item.partition}`">
            <td><strong>{{ item.topic }}</strong></td>
            <td><span class="partition-tag">P{{ item.partition }}</span></td>
            <td>{{ item.logStartOffset.toLocaleString() }}</td>
            <td>
              <span v-if="item.hasCommitted">{{ item.committedOffset.toLocaleString() }}</span>
              <span v-else class="muted">未提交</span>
            </td>
            <td>{{ item.logEndOffset.toLocaleString() }}</td>
            <td><strong :class="{ 'lag-warning': item.lag > 0 }">{{ item.lag.toLocaleString() }}</strong></td>
            <td>
              <div class="progress-track">
                <i :style="{ width: `${Math.max(0, Math.min(100, item.logEndOffset === item.logStartOffset ? 100 : ((item.hasCommitted ? item.committedOffset : item.logStartOffset) - item.logStartOffset) / (item.logEndOffset - item.logStartOffset) * 100))}%` }"></i>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon consumer">
          <svg viewBox="0 0 24 24"><path d="M5 7h14v10H5zM8 4h8M8 20h8" /><path d="M9 11h6M9 14h4" /></svg>
        </div>
        <strong>{{ loading ? "正在读取分区进度" : loadError ? "读取失败" : "没有分区消费记录" }}</strong>
        <p>{{ loadError || (loading ? "正在读取开始、当前和结束 Offset…" : "该消费组暂时没有已提交的 Offset。") }}</p>
      </div>

      <AppPagination
        v-model:page="page"
        :page-size="pageSize"
        :total="filteredPartitions.length"
      />
    </div>
  </section>
</template>

