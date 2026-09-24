<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { createTopic, deleteConsumer, deleteTopic, fetchTopicDeletionPlan, listTopics, recreateTopic } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
import { alertDialog, confirmDialog } from "@/dialog";

interface TopicRow {
  name: string;
  partitions: number;
  consumerGroupCount?: number;
  internal: boolean;
  healthy: boolean;
  problemPartitions: number;
}

const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const topics = ref<TopicRow[]>([]);
const totalPartitions = ref(0);
const loading = ref(false);
const loadError = ref("");
const deletingTopic = ref("");
const recreatingTopic = ref("");
const pendingTopicAction = ref<{ action: "delete" | "recreate"; topic: string } | null>(null);
const confirmedTopicAction = ref<{ action: "delete" | "recreate"; topic: string } | null>(null);
const showCreateForm = ref(false);
const creatingTopic = ref(false);
const newTopicName = ref("");
const newTopicPartitions = ref(3);
const newTopicReplicationFactor = ref<number>();
const createError = ref("");
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
    topics.value = response.items;
    totalPartitions.value = response.totalPartitions;
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

async function removeTopic(topic: string) {
  if (deletingTopic.value) return;
  if (confirmedTopicAction.value?.action !== "delete" || confirmedTopicAction.value.topic !== topic) {
    pendingTopicAction.value = { action: "delete", topic };
    return;
  }
  confirmedTopicAction.value = null;
  deletingTopic.value = topic;
  loadError.value = "";
  try {
    const plan = await fetchTopicDeletionPlan(topic, connection.form);
    const deleting = plan.groupsToDelete.length
      ? `\n\n将同时删除仅消费此 Topic 的 ${plan.groupsToDelete.length} 个消费组：\n${plan.groupsToDelete.map((group) => `- ${group.groupId}`).join("\n")}`
      : "\n\n没有仅消费此 Topic 的消费组需要删除。";
    const keeping = plan.groupsKept.length
      ? `\n\n以下 ${plan.groupsKept.length} 个消费组还消费其他 Topic，将保留：\n${plan.groupsKept.map((group) => `- ${group.groupId}（${group.topics.join("、")}）`).join("\n")}`
      : "";
    const result = await deleteTopic(topic, connection.form);
    if (result.failedGroupDeletions?.length) {
      const failedGroups = result.failedGroupDeletions;
      if (await confirmDialog("部分消费组未删除", `${result.message}\n未删除的消费组：${failedGroups.join("、")}\n\n这通常表示消费者仍在线并重新加入了消费组。是否立即再删除一次？`, "立即再试", true)) {
        const retries = await Promise.allSettled(failedGroups.map((groupId) => deleteConsumer(groupId, connection.form)));
        const stillFailed = failedGroups.filter((_, index) => retries[index].status === "rejected");
        await alertDialog("消费组删除结果", stillFailed.length ? `以下消费组仍未删除，可能仍有客户端在线：${stillFailed.join("、")}` : "已完成消费组的再次删除。");
      }
    }
    topics.value = topics.value.filter((item) => item.name !== topic);
  } catch (reason) {
    loadError.value = reason instanceof Error ? reason.message : "Topic 删除失败";
  } finally {
    deletingTopic.value = "";
  }
}

async function recreateCurrentTopic(topic: string) {
  if (deletingTopic.value || recreatingTopic.value) return;
  if (confirmedTopicAction.value?.action !== "recreate" || confirmedTopicAction.value.topic !== topic) {
    pendingTopicAction.value = { action: "recreate", topic };
    return;
  }
  confirmedTopicAction.value = null;
  recreatingTopic.value = topic;
  loadError.value = "";
  try {
    const plan = await fetchTopicDeletionPlan(topic, connection.form);
    const deleting = plan.groupsToDelete.length
      ? `\n\n将同时删除仅消费此 Topic 的 ${plan.groupsToDelete.length} 个消费组：\n${plan.groupsToDelete.map((group) => `- ${group.groupId}`).join("\n")}`
      : "\n\n没有仅消费此 Topic 的消费组需要删除。";
    const keeping = plan.groupsKept.length
      ? `\n\n以下 ${plan.groupsKept.length} 个消费组还消费其他 Topic，将保留：\n${plan.groupsKept.map((group) => `- ${group.groupId}（${group.topics.join("、")}）`).join("\n")}`
      : "";
    const result = await recreateTopic(topic, connection.form);
    await alertDialog("Topic 已重建", `${result.message}\n分区数：${result.partitions}；副本数：${result.replicationFactor}`);
    if (result.failedGroupDeletions?.length) {
      const failedGroups = result.failedGroupDeletions;
      if (await confirmDialog("部分消费组未删除", `以下消费组未删除，可能仍有客户端在线：${failedGroups.join("、")}\n\n是否立即再删除一次？`, "立即再试", true)) {
        const retries = await Promise.allSettled(failedGroups.map((groupId) => deleteConsumer(groupId, connection.form)));
        const stillFailed = failedGroups.filter((_, index) => retries[index].status === "rejected");
        await alertDialog("消费组删除结果", stillFailed.length ? `以下消费组仍未删除，可能仍有客户端在线：${stillFailed.join("、")}` : "已完成消费组的再次删除。");
      }
    }
    await loadTopics();
  } catch (reason) {
    loadError.value = reason instanceof Error ? reason.message : "Topic 重建失败";
  } finally {
    recreatingTopic.value = "";
  }
}

function openCreateForm() {
  createError.value = "";
  showCreateForm.value = true;
}

async function createNewTopic() {
  const topic = newTopicName.value.trim();
  if (!topic) {
    createError.value = "请填写 Topic 名称";
    return;
  }
  if (!Number.isInteger(newTopicPartitions.value) || newTopicPartitions.value < 1) {
    createError.value = "分区数必须为大于 0 的整数";
    return;
  }
  if (newTopicReplicationFactor.value !== undefined && (!Number.isInteger(newTopicReplicationFactor.value) || newTopicReplicationFactor.value < 1)) {
    createError.value = "副本数必须为大于 0 的整数";
    return;
  }
  const replication = newTopicReplicationFactor.value;
  if (!await confirmDialog("创建 Topic？", `Topic：${topic}\n分区数：${newTopicPartitions.value}\n副本数：${replication ?? "使用集群默认值"}`, "确认创建")) return;

  creatingTopic.value = true;
  createError.value = "";
  try {
    const result = await createTopic(topic, connection.form, newTopicPartitions.value, replication);
    showCreateForm.value = false;
    newTopicName.value = "";
    await loadTopics();
    await alertDialog("Topic 创建成功", `${result.message}\n分区数：${result.partitions}；副本数：${result.replicationFactor}`);
  } catch (reason) {
    createError.value = reason instanceof Error ? reason.message : "Topic 创建失败";
  } finally {
    creatingTopic.value = false;
  }
}
</script>

<template>
  <section class="list-page">
    <div class="page-heading">
      <div>
        <span class="section-kicker">STREAMS</span>
        <h1>Topics</h1>
        <p>查看当前集群中的 Topic、分区数量和分区健康状态。</p>
      </div>
      <div class="topic-list-actions">
        <button class="topic-produce-button" type="button" :disabled="loading || creatingTopic" @click="openCreateForm">新增 Topic</button>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadTopics">
          <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5" /></svg>
          {{ loading ? "读取中…" : "刷新" }}
        </button>
      </div>
    </div>

    <form v-if="showCreateForm" class="produce-card topic-create-card" @submit.prevent="createNewTopic">
      <div class="produce-card-heading">
        <div><strong>新增 Topic</strong><small>创建完成后会等待分区 Leader 就绪，再显示在列表中。</small></div>
        <button type="button" :disabled="creatingTopic" @click="showCreateForm = false">取消</button>
      </div>
      <div class="topic-create-fields">
        <label><span>Topic 名称</span><input v-model="newTopicName" required placeholder="例如 orders-v2" /></label>
        <label><span>分区数</span><input v-model.number="newTopicPartitions" type="number" min="1" max="100000" step="1" required /></label>
        <label><span>副本数（可选）</span><input v-model.number="newTopicReplicationFactor" type="number" min="1" max="32767" step="1" placeholder="使用集群默认值" /><small>填写时不能超过集群 Broker 数量</small></label>
      </div>
      <p v-if="createError" class="produce-feedback error">{{ createError }}</p>
      <div class="produce-actions"><button class="topic-produce-button" type="submit" :disabled="creatingTopic">{{ creatingTopic ? "创建中…" : "创建 Topic" }}</button></div>
    </form>

    <div class="summary-grid">
      <article><span>TOPIC 总数</span><strong>{{ topics.length }}</strong><small>当前集群</small></article>
      <article><span>分区总数</span><strong>{{ totalPartitions }}</strong><small>全部 Topic</small></article>
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
      <p class="topic-danger-hint">提示：<b>清空并重建</b>会删除全部消息并重建 Topic；<b>删除</b>会永久删除 Topic。两项操作都会影响只消费该 Topic 的消费组。</p>

      <table v-if="filteredTopics.length">
        <thead><tr><th>Topic 名称</th><th>分区</th><th>消费组数</th><th>类型</th><th>状态</th><th class="topic-actions-heading">操作</th></tr></thead>
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
            <td :title="topic.consumerGroupCount === undefined ? '无法读取消费组数据' : ''">
              {{ topic.consumerGroupCount ?? "—" }}
            </td>
            <td>{{ topic.internal ? "内部" : "业务" }}</td>
            <td>
              <span :class="['row-status', { error: !topic.healthy }]">
                {{ topic.healthy ? "正常" : `异常${topic.problemPartitions ? `（${topic.problemPartitions} 个分区）` : ""}` }}
              </span>
            </td>
            <td class="topic-actions-cell">
              <button
                class="topic-recreate-button"
                type="button"
                :disabled="Boolean(deletingTopic || recreatingTopic)"
                :aria-label="`删除并重建 Topic ${topic.name}`"
                title="清空消息并按原分区数、副本数和自定义配置重建"
                @click.stop="recreateCurrentTopic(topic.name)"
              >
                {{ recreatingTopic === topic.name ? "重建中…" : "清空并重建" }}
              </button>
              <button
                class="consumer-delete-button"
                type="button"
                :disabled="Boolean(deletingTopic || recreatingTopic)"
                :aria-label="`删除 Topic ${topic.name}`"
                title="删除 Topic 及其专属消费组"
                @click.stop="removeTopic(topic.name)"
              >
                {{ deletingTopic === topic.name ? "删除中…" : "删除" }}
              </button>
            </td>
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
      <div v-if="pendingTopicAction" class="app-dialog-backdrop" role="presentation" @click.self="pendingTopicAction = null">
        <section class="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="topic-list-action-title">
          <span class="app-dialog-kicker">高风险操作</span>
          <h2 id="topic-list-action-title">{{ pendingTopicAction.action === 'recreate' ? `清空并重建 “${pendingTopicAction.topic}”？` : `永久删除 “${pendingTopicAction.topic}”？` }}</h2>
          <p>{{ pendingTopicAction.action === 'recreate' ? '全部消息会被清空，并按原分区数、副本数和自定义配置重建。专属消费组也会被删除。' : 'Topic、全部消息和专属消费组会被永久删除，无法恢复。' }}</p>
          <div class="app-dialog-actions">
            <button type="button" class="app-dialog-cancel" @click="pendingTopicAction = null">取消</button>
            <button type="button" class="app-dialog-danger" @click="confirmedTopicAction = pendingTopicAction; pendingTopicAction = null; confirmedTopicAction?.action === 'delete' ? removeTopic(confirmedTopicAction.topic) : recreateCurrentTopic(confirmedTopicAction!.topic)">{{ pendingTopicAction.action === 'recreate' ? '确认清空并重建' : '确认永久删除' }}</button>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
