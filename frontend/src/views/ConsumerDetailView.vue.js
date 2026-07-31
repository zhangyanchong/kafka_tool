import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listConsumerPartitions } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
const route = useRoute();
const connection = useConnectionStore();
const groupId = computed(() => String(route.params.groupId || ""));
const partitions = ref([]);
const keyword = ref("");
const page = ref(1);
const pageSize = 10;
const loading = ref(false);
const loadError = ref("");
const filteredPartitions = computed(() => {
    const search = keyword.value.trim().toLowerCase();
    if (!search)
        return partitions.value;
    return partitions.value.filter((item) => item.topic.toLowerCase().includes(search) ||
        String(item.partition) === search);
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
    if (page.value > lastPage)
        page.value = lastPage;
});
async function loadPartitions() {
    loading.value = true;
    loadError.value = "";
    try {
        const response = await listConsumerPartitions(groupId.value, connection.form);
        partitions.value = response.items;
    }
    catch (reason) {
        loadError.value = reason instanceof Error ? reason.message : "分区消费进度读取失败";
    }
    finally {
        loading.value = false;
    }
}
onMounted(loadPartitions);
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
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "back-link" },
    to: "/dashboard/consumers",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "back-link" },
    to: "/dashboard/consumers",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['back-link']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-heading detail-heading" },
});
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "section-kicker" },
});
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
(__VLS_ctx.groupId);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.loadPartitions) },
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
(__VLS_ctx.topicCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.partitions.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.totalLag.toLocaleString());
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
    placeholder: "搜索 Topic 或分区编号",
});
(__VLS_ctx.keyword);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.filteredPartitions.length);
if (__VLS_ctx.filteredPartitions.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [item] of __VLS_vFor((__VLS_ctx.paginatedPartitions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            key: (`${item.topic}-${item.partition}`),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (item.topic);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "partition-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['partition-tag']} */ ;
        (item.partition);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.logStartOffset.toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        if (item.hasCommitted) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (item.committedOffset.toLocaleString());
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "muted" },
            });
            /** @type {__VLS_StyleScopedClasses['muted']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (item.logEndOffset.toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
            ...{ class: ({ 'lag-warning': item.lag > 0 }) },
        });
        /** @type {__VLS_StyleScopedClasses['lag-warning']} */ ;
        (item.lag.toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "progress-track" },
        });
        /** @type {__VLS_StyleScopedClasses['progress-track']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ style: ({ width: `${Math.max(0, Math.min(100, item.logEndOffset === item.logStartOffset ? 100 : ((item.hasCommitted ? item.committedOffset : item.logStartOffset) - item.logStartOffset) / (item.logEndOffset - item.logStartOffset) * 100))}%` }) },
        });
        // @ts-ignore
        [groupId, loadPartitions, loading, loading, topicCount, partitions, totalLag, keyword, filteredPartitions, filteredPartitions, paginatedPartitions,];
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M5 7h14v10H5zM8 4h8M8 20h8",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M9 11h6M9 14h4",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.loading ? "正在读取分区进度" : __VLS_ctx.loadError ? "读取失败" : "没有分区消费记录");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.loadError || (__VLS_ctx.loading ? "正在读取开始、当前和结束 Offset…" : "该消费组暂时没有已提交的 Offset。"));
}
const __VLS_6 = AppPagination;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredPartitions.length),
}));
const __VLS_8 = __VLS_7({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredPartitions.length),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
// @ts-ignore
[loading, loading, filteredPartitions, loadError, loadError, page, pageSize,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
