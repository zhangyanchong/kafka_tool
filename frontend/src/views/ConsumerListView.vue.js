import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listConsumers } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const consumers = ref([]);
const loading = ref(false);
const loadError = ref("");
const connection = useConnectionStore();
const router = useRouter();
const filteredConsumers = computed(() => consumers.value.filter((consumer) => consumer.groupId.toLowerCase().includes(keyword.value.toLowerCase())));
const paginatedConsumers = computed(() => {
    const start = (page.value - 1) * pageSize;
    return filteredConsumers.value.slice(start, start + pageSize);
});
watch(keyword, () => { page.value = 1; });
watch(() => filteredConsumers.value.length, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page.value > lastPage)
        page.value = lastPage;
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
    }
    catch (reason) {
        loadError.value = reason instanceof Error ? reason.message : "Consumer 读取失败";
    }
    finally {
        loading.value = false;
    }
}
onMounted(loadConsumers);
function openConsumer(groupId) {
    router.push({ name: "consumer-detail", params: { groupId } });
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
    ...{ onClick: (__VLS_ctx.loadConsumers) },
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
(__VLS_ctx.consumers.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
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
    placeholder: "搜索 Consumer Group",
});
(__VLS_ctx.keyword);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.filteredConsumers.length);
if (__VLS_ctx.filteredConsumers.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [consumer] of __VLS_vFor((__VLS_ctx.paginatedConsumers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredConsumers.length))
                        throw 0;
                    return (__VLS_ctx.openConsumer(consumer.groupId));
                    // @ts-ignore
                    [loadConsumers, loading, loading, consumers, keyword, filteredConsumers, filteredConsumers, paginatedConsumers, openConsumer,];
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!(__VLS_ctx.filteredConsumers.length))
                        throw 0;
                    return (__VLS_ctx.openConsumer(consumer.groupId));
                    // @ts-ignore
                    [openConsumer,];
                } },
            key: (consumer.groupId),
            ...{ class: "clickable-row" },
            tabindex: "0",
        });
        /** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (consumer.groupId);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "row-arrow" },
        });
        /** @type {__VLS_StyleScopedClasses['row-arrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "row-status" },
        });
        /** @type {__VLS_StyleScopedClasses['row-status']} */ ;
        (consumer.state);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (consumer.members);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (consumer.topics);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (consumer.consumePerMinute.toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (consumer.lag.toLocaleString());
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
        ...{ class: "empty-icon consumer" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['consumer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "8",
        cy: "9",
        r: "3",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "16.5",
        cy: "10",
        r: "2.5",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M3.5 19c.3-3 1.8-4.5 4.5-4.5s4.2 1.5 4.5 4.5M13 18.5c.3-2.4 1.4-3.6 3.5-3.6 2.2 0 3.4 1.2 3.7 3.6",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.loading ? "正在读取 Consumer" : __VLS_ctx.loadError ? "Consumer 读取失败" : "没有找到 Consumer");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.loadError || (__VLS_ctx.loading ? "正在从 Kafka 集群获取完整列表…" : "当前集群没有可显示的消费组。"));
}
const __VLS_0 = AppPagination;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredConsumers.length),
}));
const __VLS_2 = __VLS_1({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredConsumers.length),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
// @ts-ignore
[loading, loading, filteredConsumers, loadError, loadError, page, pageSize,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
