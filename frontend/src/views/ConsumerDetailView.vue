<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import {
  listConsumerPartitions,
  type ConsumerMember,
  type ConsumerPartition,
} from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";

const route = useRoute();
const connection = useConnectionStore();
const groupId = computed(() => String(route.params.groupId || ""));
const partitions = ref<ConsumerPartition[]>([]);
const members = ref<ConsumerMember[]>([]);
const membersAvailable = ref(false);
const groupState = ref("");
const protocolType = ref("");
const protocol = ref("");
const keyword = ref("");
const partitionFilter = ref<"all" | "lagged" | "uncommitted" | "anomaly">("all");
const partitionSort = ref<"lag_desc" | "partition">("lag_desc");
const page = ref(1);
const pageSize = 10;
const memberPage = ref(1);
const memberPageSize = 5;
const membersCollapsed = ref(true);
const loading = ref(false);
const loadError = ref("");
const hasLoaded = ref(false);

function isOffsetAnomaly(item: ConsumerPartition) {
  return ["before_start", "after_end", "commit_error"].includes(item.offsetStatus);
}

const filteredPartitions = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  return partitions.value
    .filter((item) => {
      if (search && !item.topic.toLowerCase().includes(search) && String(item.partition) !== search) {
        return false;
      }
      if (partitionFilter.value === "lagged") return item.lag > 0;
      if (partitionFilter.value === "uncommitted") return item.offsetStatus === "uncommitted";
      if (partitionFilter.value === "anomaly") return isOffsetAnomaly(item);
      return true;
    })
    .sort((left, right) => {
      if (partitionSort.value === "lag_desc") {
        return right.lag - left.lag || left.topic.localeCompare(right.topic) || left.partition - right.partition;
      }
      return left.topic.localeCompare(right.topic) || left.partition - right.partition;
    });
});
const paginatedPartitions = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredPartitions.value.slice(start, start + pageSize);
});
const paginatedMembers = computed(() => {
  const start = (memberPage.value - 1) * memberPageSize;
  return members.value.slice(start, start + memberPageSize);
});
const topicCount = computed(() => new Set(partitions.value.map((item) => item.topic)).size);
const totalLag = computed(() => partitions.value.reduce((sum, item) => sum + item.lag, 0));
const metricValue = (value: number) => {
  if (hasLoaded.value) return value.toLocaleString();
  return loading.value ? "读取中" : "不可用";
};
const groupMetaValue = (value: string) => {
  if (value) return value;
  return !hasLoaded.value && loading.value ? "读取中" : "信息不可用";
};

watch([keyword, partitionFilter, partitionSort], () => { page.value = 1; });
watch(() => filteredPartitions.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (page.value > lastPage) page.value = lastPage;
});
watch(() => members.value.length, (total) => {
  const lastPage = Math.max(1, Math.ceil(total / memberPageSize));
  if (memberPage.value > lastPage) memberPage.value = lastPage;
});

function memberAssignments(member: ConsumerMember) {
  if (!member.assignments.length) return "暂未分配";
  return member.assignments
    .map((assignment) => `${assignment.topic} [${assignment.partitions.join(", ")}]`)
    .join("；");
}

function offsetStatusLabel(item: ConsumerPartition) {
  switch (item.offsetStatus) {
    case "before_start": return "早于 Start";
    case "after_end": return "超过 End";
    case "commit_error": return "提交查询异常";
    case "uncommitted": return "未提交";
    default: return "范围内";
  }
}

async function loadPartitions() {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await listConsumerPartitions(groupId.value, connection.form);
    partitions.value = response.items;
    members.value = response.members;
    membersAvailable.value = response.membersAvailable;
    groupState.value = response.state || "";
    protocolType.value = response.protocolType || "";
    protocol.value = response.protocol || "";
    hasLoaded.value = true;
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
        <div class="group-meta">
          <span>状态：<b>{{ groupMetaValue(groupState) }}</b></span>
          <span>类型：<b>{{ groupMetaValue(protocolType) }}</b></span>
          <span>分配协议：<b>{{ groupMetaValue(protocol) }}</b></span>
        </div>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadPartitions">
        <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5" /></svg>
        {{ loading ? "读取中…" : "刷新" }}
      </button>
    </div>

    <div class="summary-grid">
      <article><span>消费 Topic</span><strong>{{ metricValue(topicCount) }}</strong><small>个 Topic</small></article>
      <article><span>消费分区</span><strong>{{ metricValue(partitions.length) }}</strong><small>个 Partition</small></article>
      <article><span>总剩余量</span><strong>{{ metricValue(totalLag) }}</strong><small>条消息 Lag</small></article>
    </div>

    <div class="data-card member-card">
      <div class="table-toolbar member-toolbar">
        <div>
          <strong>活跃成员与分区分配</strong>
          <small>来自单次 DescribeGroups 查询</small>
        </div>
        <div class="member-toolbar-actions">
          <span>
            {{ !hasLoaded && loading
              ? "读取中…"
              : membersAvailable ? `${members.length} 个成员` : "成员信息不可用" }}
          </span>
          <button
            class="collapse-button"
            type="button"
            :aria-expanded="!membersCollapsed"
            @click="membersCollapsed = !membersCollapsed"
          >
            {{ membersCollapsed ? "展开" : "收起" }}
            <svg :class="{ collapsed: membersCollapsed }" viewBox="0 0 24 24">
              <path d="m7 14 5-5 5 5" />
            </svg>
          </button>
        </div>
      </div>

      <table v-if="!membersCollapsed && membersAvailable && members.length">
        <thead>
          <tr>
            <th>Client ID</th>
            <th>Client Host</th>
            <th>Instance ID</th>
            <th>分区数</th>
            <th>分区分配</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in paginatedMembers" :key="member.memberId">
            <td><strong>{{ member.clientId || "未提供" }}</strong></td>
            <td>{{ member.clientHost || "未提供" }}</td>
            <td>{{ member.instanceId || "动态成员" }}</td>
            <td>{{ member.partitionCount }}</td>
            <td class="assignment-cell">{{ memberAssignments(member) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="!membersCollapsed" class="member-empty">
        <strong>
          {{ !hasLoaded && loading
            ? "正在读取成员信息"
            : membersAvailable ? "当前没有活跃成员" : "成员信息不可用" }}
        </strong>
        <p>
          {{ !hasLoaded && loading
            ? "仅查询当前消费组，不会扫描其他消费组。"
            : membersAvailable
            ? "消费组可能为空闲状态，已提交的 Offset 仍会在下方展示。"
            : "可能缺少 DescribeGroups 权限；Offset 和 Lag 查询不受影响。" }}
        </p>
      </div>

      <AppPagination
        v-if="!membersCollapsed && membersAvailable && members.length > memberPageSize"
        v-model:page="memberPage"
        :page-size="memberPageSize"
        :total="members.length"
      />
    </div>

    <div class="data-card partition-card">
      <div class="table-toolbar">
        <div class="partition-toolbar-controls">
          <div class="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input v-model="keyword" placeholder="搜索 Topic 或分区编号" />
          </div>
          <select v-model="partitionFilter" aria-label="筛选分区">
            <option value="all">全部分区</option>
            <option value="lagged">只看有积压</option>
            <option value="uncommitted">只看未提交</option>
            <option value="anomaly">只看 Offset 异常</option>
          </select>
          <select v-model="partitionSort" aria-label="分区排序">
            <option value="lag_desc">Lag 从高到低</option>
            <option value="partition">按分区编号</option>
          </select>
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
            <th>Offset 状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in paginatedPartitions"
            :key="`${item.topic}-${item.partition}`"
            :class="{ 'offset-anomaly-row': isOffsetAnomaly(item) }"
          >
            <td><strong>{{ item.topic }}</strong></td>
            <td><span class="partition-tag">P{{ item.partition }}</span></td>
            <td>{{ item.logStartOffset.toLocaleString() }}</td>
            <td>
              <span v-if="item.offsetStatus === 'commit_error'" class="offset-status anomaly">查询异常</span>
              <span v-else-if="item.hasCommitted">{{ item.committedOffset.toLocaleString() }}</span>
              <span v-else class="muted">未提交</span>
            </td>
            <td>{{ item.logEndOffset.toLocaleString() }}</td>
            <td><strong :class="{ 'lag-warning': item.lag > 0 }">{{ item.lag.toLocaleString() }}</strong></td>
            <td>
              <span
                class="offset-status"
                :class="{
                  normal: item.offsetStatus === 'normal',
                  uncommitted: item.offsetStatus === 'uncommitted',
                  anomaly: isOffsetAnomaly(item),
                }"
                :title="item.errorMessage || undefined"
              >
                {{ offsetStatusLabel(item) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon consumer">
          <svg viewBox="0 0 24 24"><path d="M5 7h14v10H5zM8 4h8M8 20h8" /><path d="M9 11h6M9 14h4" /></svg>
        </div>
        <strong>{{ loading ? "正在读取分区进度" : loadError ? "读取失败" : "没有符合条件的分区" }}</strong>
        <p>{{ loadError || (loading ? "正在读取开始、当前和结束 Offset…" : "可以调整搜索、筛选或排序条件。") }}</p>
      </div>

      <AppPagination
        v-model:page="page"
        :page-size="pageSize"
        :total="filteredPartitions.length"
      />
    </div>
  </section>
</template>
