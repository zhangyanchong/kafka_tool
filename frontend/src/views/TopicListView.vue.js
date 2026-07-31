import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listTopics } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const topics = ref([]);
const totalPartitions = ref(0);
const loading = ref(false);
const loadError = ref("");
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
if (__VLS_ctx.filteredTopics.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [topic] of __VLS_vFor((__VLS_ctx.paginatedTopics))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredTopics.length))
                        throw 0;
                    return (__VLS_ctx.openTopic(topic.name));
                    // @ts-ignore
                    [loadTopics, loading, loading, topics, totalPartitions, internalTopicCount, keyword, filteredTopics, filteredTopics, paginatedTopics, openTopic,];
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (topic.internal ? "内部" : "业务");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (['row-status', { error: !topic.healthy }]) },
        });
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        /** @type {__VLS_StyleScopedClasses['row-status']} */ ;
        (topic.healthy ? "正常" : `异常${topic.problemPartitions ? `（${topic.problemPartitions} 个分区）` : ""}`);
        // @ts-ignore
        [];
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
// @ts-ignore
[loading, loading, filteredTopics, loadError, loadError, page, pageSize,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
