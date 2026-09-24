import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { createTopic, deleteConsumer, deleteTopic, fetchTopicDeletionPlan, listTopics, recreateTopic } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
import { alertDialog, confirmDialog } from "@/dialog";
const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const topics = ref([]);
const totalPartitions = ref(0);
const loading = ref(false);
const loadError = ref("");
const deletingTopic = ref("");
const recreatingTopic = ref("");
const pendingTopicAction = ref(null);
const confirmedTopicAction = ref(null);
const showCreateForm = ref(false);
const creatingTopic = ref(false);
const newTopicName = ref("");
const newTopicPartitions = ref(3);
const newTopicReplicationFactor = ref();
const createError = ref("");
const connection = useConnectionStore();
const router = useRouter();
const filteredTopics = computed(() => topics.value.filter((topic) => topic.name.toLowerCase().includes(keyword.value.toLowerCase())));
const paginatedTopics = computed(() => {
    const start = (page.value - 1) * pageSize;
    return filteredTopics.value.slice(start, start + pageSize);
});
const internalTopicCount = computed(() => topics.value.filter((topic) => topic.internal).length);
watch(keyword, () => { page.value = 1; });
watch(() => filteredTopics.value.length, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page.value > lastPage)
        page.value = lastPage;
});
async function loadTopics() {
    loading.value = true;
    loadError.value = "";
    try {
        const response = await listTopics(connection.form);
        topics.value = response.items;
        totalPartitions.value = response.totalPartitions;
    }
    catch (reason) {
        loadError.value = reason instanceof Error ? reason.message : "Topic 读取失败";
    }
    finally {
        loading.value = false;
    }
}
onMounted(loadTopics);
function openTopic(topic) {
    router.push({ name: "topic-detail", params: { topic } });
}
async function removeTopic(topic) {
    if (deletingTopic.value)
        return;
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
    }
    catch (reason) {
        loadError.value = reason instanceof Error ? reason.message : "Topic 删除失败";
    }
    finally {
        deletingTopic.value = "";
    }
}
async function recreateCurrentTopic(topic) {
    if (deletingTopic.value || recreatingTopic.value)
        return;
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
    }
    catch (reason) {
        loadError.value = reason instanceof Error ? reason.message : "Topic 重建失败";
    }
    finally {
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
    if (!await confirmDialog("创建 Topic？", `Topic：${topic}\n分区数：${newTopicPartitions.value}\n副本数：${replication ?? "使用集群默认值"}`, "确认创建"))
        return;
    creatingTopic.value = true;
    createError.value = "";
    try {
        const result = await createTopic(topic, connection.form, newTopicPartitions.value, replication);
        showCreateForm.value = false;
        newTopicName.value = "";
        await loadTopics();
        await alertDialog("Topic 创建成功", `${result.message}\n分区数：${result.partitions}；副本数：${result.replicationFactor}`);
    }
    catch (reason) {
        createError.value = reason instanceof Error ? reason.message : "Topic 创建失败";
    }
    finally {
        creatingTopic.value = false;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "list-page" },
});
/** @type {__VLS_StyleScopedClasses['list-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-heading" },
});
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "section-kicker" },
});
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "topic-list-actions" },
});
/** @type {__VLS_StyleScopedClasses['topic-list-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.openCreateForm) },
    ...{ class: "topic-produce-button" },
    type: "button",
    disabled: (__VLS_ctx.loading || __VLS_ctx.creatingTopic),
});
/** @type {__VLS_StyleScopedClasses['topic-produce-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.loadTopics) },
    ...{ class: "refresh-button" },
    type: "button",
    disabled: (__VLS_ctx.loading),
});
/** @type {__VLS_StyleScopedClasses['refresh-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M20 6v5h-5M4 18v-5h5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M18.5 10A7 7 0 0 0 6 7.5L4 11M5.5 14A7 7 0 0 0 18 16.5l2-3.5",
});
(__VLS_ctx.loading ? "读取中…" : "刷新");
if (__VLS_ctx.showCreateForm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
        ...{ onSubmit: (__VLS_ctx.createNewTopic) },
        ...{ class: "produce-card topic-create-card" },
    });
    /** @type {__VLS_StyleScopedClasses['produce-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['topic-create-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "produce-card-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['produce-card-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showCreateForm))
                    throw 0;
                return (__VLS_ctx.showCreateForm = false);
                // @ts-ignore
                [openCreateForm, loading, loading, loading, creatingTopic, loadTopics, showCreateForm, showCreateForm, createNewTopic,];
            } },
        type: "button",
        disabled: (__VLS_ctx.creatingTopic),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "topic-create-fields" },
    });
    /** @type {__VLS_StyleScopedClasses['topic-create-fields']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        required: true,
        placeholder: "例如 orders-v2",
    });
    (__VLS_ctx.newTopicName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "1",
        max: "100000",
        step: "1",
        required: true,
    });
    (__VLS_ctx.newTopicPartitions);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "1",
        max: "32767",
        step: "1",
        placeholder: "使用集群默认值",
    });
    (__VLS_ctx.newTopicReplicationFactor);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    if (__VLS_ctx.createError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "produce-feedback error" },
        });
        /** @type {__VLS_StyleScopedClasses['produce-feedback']} */ ;
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        (__VLS_ctx.createError);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "produce-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['produce-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "topic-produce-button" },
        type: "submit",
        disabled: (__VLS_ctx.creatingTopic),
    });
    /** @type {__VLS_StyleScopedClasses['topic-produce-button']} */ ;
    (__VLS_ctx.creatingTopic ? "创建中…" : "创建 Topic");
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "summary-grid" },
});
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.topics.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.totalPartitions);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.internalTopicCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "data-card" },
});
/** @type {__VLS_StyleScopedClasses['data-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "table-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['table-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-box" },
});
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "11",
    cy: "11",
    r: "6.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "m16 16 4 4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    placeholder: "搜索 Topic 名称",
});
(__VLS_ctx.keyword);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.filteredTopics.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "topic-danger-hint" },
});
/** @type {__VLS_StyleScopedClasses['topic-danger-hint']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
if (__VLS_ctx.filteredTopics.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "topic-actions-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['topic-actions-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [topic] of __VLS_vFor((__VLS_ctx.paginatedTopics))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredTopics.length))
                        throw 0;
                    return (__VLS_ctx.openTopic(topic.name));
                    // @ts-ignore
                    [creatingTopic, creatingTopic, creatingTopic, newTopicName, newTopicPartitions, newTopicReplicationFactor, createError, createError, topics, totalPartitions, internalTopicCount, keyword, filteredTopics, filteredTopics, paginatedTopics, openTopic,];
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!(__VLS_ctx.filteredTopics.length))
                        throw 0;
                    return (__VLS_ctx.openTopic(topic.name));
                    // @ts-ignore
                    [openTopic,];
                } },
            key: (topic.name),
            ...{ class: "clickable-row" },
            tabindex: "0",
        });
        /** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (topic.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "row-arrow" },
        });
        /** @type {__VLS_StyleScopedClasses['row-arrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (topic.partitions);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
            title: (topic.consumerGroupCount === undefined ? '无法读取消费组数据' : ''),
        });
        (topic.consumerGroupCount ?? "—");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (topic.internal ? "内部" : "业务");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (['row-status', { error: !topic.healthy }]) },
        });
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        /** @type {__VLS_StyleScopedClasses['row-status']} */ ;
        (topic.healthy ? "正常" : `异常${topic.problemPartitions ? `（${topic.problemPartitions} 个分区）` : ""}`);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
            ...{ class: "topic-actions-cell" },
        });
        /** @type {__VLS_StyleScopedClasses['topic-actions-cell']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredTopics.length))
                        throw 0;
                    return (__VLS_ctx.recreateCurrentTopic(topic.name));
                    // @ts-ignore
                    [recreateCurrentTopic,];
                } },
            ...{ class: "topic-recreate-button" },
            type: "button",
            disabled: (Boolean(__VLS_ctx.deletingTopic || __VLS_ctx.recreatingTopic)),
            'aria-label': (`删除并重建 Topic ${topic.name}`),
            title: "清空消息并按原分区数、副本数和自定义配置重建",
        });
        /** @type {__VLS_StyleScopedClasses['topic-recreate-button']} */ ;
        (__VLS_ctx.recreatingTopic === topic.name ? "重建中…" : "清空并重建");
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredTopics.length))
                        throw 0;
                    return (__VLS_ctx.removeTopic(topic.name));
                    // @ts-ignore
                    [deletingTopic, recreatingTopic, recreatingTopic, removeTopic,];
                } },
            ...{ class: "consumer-delete-button" },
            type: "button",
            disabled: (Boolean(__VLS_ctx.deletingTopic || __VLS_ctx.recreatingTopic)),
            'aria-label': (`删除 Topic ${topic.name}`),
            title: "删除 Topic 及其专属消费组",
        });
        /** @type {__VLS_StyleScopedClasses['consumer-delete-button']} */ ;
        (__VLS_ctx.deletingTopic === topic.name ? "删除中…" : "删除");
        // @ts-ignore
        [deletingTopic, deletingTopic, recreatingTopic,];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M5 7h14v10H5zM8 4h8M8 20h8",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M9 11h6M9 14h4",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.loading ? "正在读取 Topic" : __VLS_ctx.loadError ? "Topic 读取失败" : "没有找到 Topic");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.loadError || (__VLS_ctx.loading ? "正在从 Kafka 集群获取完整列表…" : "当前集群没有可显示的 Topic。"));
}
const __VLS_0 = AppPagination;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredTopics.length),
}));
const __VLS_2 = __VLS_1({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredTopics.length),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (__VLS_ctx.pendingTopicAction) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingTopicAction))
                    throw 0;
                return (__VLS_ctx.pendingTopicAction = null);
                // @ts-ignore
                [loading, loading, filteredTopics, loadError, loadError, page, pageSize, pendingTopicAction, pendingTopicAction,];
            } },
        ...{ class: "app-dialog-backdrop" },
        role: "presentation",
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "app-dialog" },
        role: "alertdialog",
        'aria-modal': "true",
        'aria-labelledby': "topic-list-action-title",
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "app-dialog-kicker" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-kicker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        id: "topic-list-action-title",
    });
    (__VLS_ctx.pendingTopicAction.action === 'recreate' ? `清空并重建 “${__VLS_ctx.pendingTopicAction.topic}”？` : `永久删除 “${__VLS_ctx.pendingTopicAction.topic}”？`);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.pendingTopicAction.action === 'recreate' ? '全部消息会被清空，并按原分区数、副本数和自定义配置重建。专属消费组也会被删除。' : 'Topic、全部消息和专属消费组会被永久删除，无法恢复。');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "app-dialog-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingTopicAction))
                    throw 0;
                return (__VLS_ctx.pendingTopicAction = null);
                // @ts-ignore
                [pendingTopicAction, pendingTopicAction, pendingTopicAction, pendingTopicAction, pendingTopicAction,];
            } },
        type: "button",
        ...{ class: "app-dialog-cancel" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-cancel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pendingTopicAction))
                    throw 0;
                __VLS_ctx.confirmedTopicAction = __VLS_ctx.pendingTopicAction;
                __VLS_ctx.pendingTopicAction = null;
                __VLS_ctx.confirmedTopicAction?.action === 'delete' ? __VLS_ctx.removeTopic(__VLS_ctx.confirmedTopicAction.topic) : __VLS_ctx.recreateCurrentTopic(__VLS_ctx.confirmedTopicAction.topic);
                // @ts-ignore
                [recreateCurrentTopic, removeTopic, pendingTopicAction, pendingTopicAction, confirmedTopicAction, confirmedTopicAction, confirmedTopicAction, confirmedTopicAction,];
            } },
        type: "button",
        ...{ class: "app-dialog-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-danger']} */ ;
    (__VLS_ctx.pendingTopicAction.action === 'recreate' ? '确认清空并重建' : '确认永久删除');
}
// @ts-ignore
[pendingTopicAction,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
