import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppPagination from "@/components/AppPagination.vue";
import { listConsumerPartitions, } from "@/api/connections";
import { useConnectionStore } from "@/stores/connection";
const route = useRoute();
const connection = useConnectionStore();
const groupId = computed(() => String(route.params.groupId || ""));
const partitions = ref([]);
const members = ref([]);
const membersAvailable = ref(false);
const groupState = ref("");
const protocolType = ref("");
const protocol = ref("");
const keyword = ref("");
const partitionFilter = ref("all");
const partitionSort = ref("lag_desc");
const page = ref(1);
const pageSize = 10;
const memberPage = ref(1);
const memberPageSize = 5;
const membersCollapsed = ref(true);
const loading = ref(false);
const loadError = ref("");
const hasLoaded = ref(false);
function isOffsetAnomaly(item) {
    return ["before_start", "after_end", "commit_error"].includes(item.offsetStatus);
}
const filteredPartitions = computed(() => {
    const search = keyword.value.trim().toLowerCase();
    return partitions.value
        .filter((item) => {
        if (search && !item.topic.toLowerCase().includes(search) && String(item.partition) !== search) {
            return false;
        }
        if (partitionFilter.value === "lagged")
            return item.lag > 0;
        if (partitionFilter.value === "uncommitted")
            return item.offsetStatus === "uncommitted";
        if (partitionFilter.value === "anomaly")
            return isOffsetAnomaly(item);
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
const metricValue = (value) => {
    if (hasLoaded.value)
        return value.toLocaleString();
    return loading.value ? "读取中" : "不可用";
};
const groupMetaValue = (value) => {
    if (value)
        return value;
    return !hasLoaded.value && loading.value ? "读取中" : "信息不可用";
};
watch([keyword, partitionFilter, partitionSort], () => { page.value = 1; });
watch(() => filteredPartitions.value.length, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page.value > lastPage)
        page.value = lastPage;
});
watch(() => members.value.length, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / memberPageSize));
    if (memberPage.value > lastPage)
        memberPage.value = lastPage;
});
function memberAssignments(member) {
    if (!member.assignments.length)
        return "暂未分配";
    return member.assignments
        .map((assignment) => `${assignment.topic} [${assignment.partitions.join(", ")}]`)
        .join("；");
}
function offsetStatusLabel(item) {
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "group-meta" },
});
/** @type {__VLS_StyleScopedClasses['group-meta']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.groupMetaValue(__VLS_ctx.groupState));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.groupMetaValue(__VLS_ctx.protocolType));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.groupMetaValue(__VLS_ctx.protocol));
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
(__VLS_ctx.metricValue(__VLS_ctx.topicCount));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.metricValue(__VLS_ctx.partitions.length));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.metricValue(__VLS_ctx.totalLag));
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "data-card member-card" },
});
/** @type {__VLS_StyleScopedClasses['data-card']} */ ;
/** @type {__VLS_StyleScopedClasses['member-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "table-toolbar member-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['table-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['member-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "member-toolbar-actions" },
});
/** @type {__VLS_StyleScopedClasses['member-toolbar-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(!__VLS_ctx.hasLoaded && __VLS_ctx.loading
    ? "读取中…"
    : __VLS_ctx.membersAvailable ? `${__VLS_ctx.members.length} 个成员` : "成员信息不可用");
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.membersCollapsed = !__VLS_ctx.membersCollapsed);
            // @ts-ignore
            [groupId, groupMetaValue, groupMetaValue, groupMetaValue, groupState, protocolType, protocol, loadPartitions, loading, loading, loading, metricValue, metricValue, metricValue, topicCount, partitions, totalLag, hasLoaded, membersAvailable, members, membersCollapsed, membersCollapsed,];
        } },
    ...{ class: "collapse-button" },
    type: "button",
    'aria-expanded': (!__VLS_ctx.membersCollapsed),
});
/** @type {__VLS_StyleScopedClasses['collapse-button']} */ ;
(__VLS_ctx.membersCollapsed ? "展开" : "收起");
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    ...{ class: ({ collapsed: __VLS_ctx.membersCollapsed }) },
    viewBox: "0 0 24 24",
});
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "m7 14 5-5 5 5",
});
if (!__VLS_ctx.membersCollapsed && __VLS_ctx.membersAvailable && __VLS_ctx.members.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [member] of __VLS_vFor((__VLS_ctx.paginatedMembers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            key: (member.memberId),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (member.clientId || "未提供");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (member.clientHost || "未提供");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (member.instanceId || "动态成员");
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (member.partitionCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
            ...{ class: "assignment-cell" },
        });
        /** @type {__VLS_StyleScopedClasses['assignment-cell']} */ ;
        (__VLS_ctx.memberAssignments(member));
        // @ts-ignore
        [membersAvailable, members, membersCollapsed, membersCollapsed, membersCollapsed, membersCollapsed, paginatedMembers, memberAssignments,];
    }
}
else if (!__VLS_ctx.membersCollapsed) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "member-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['member-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (!__VLS_ctx.hasLoaded && __VLS_ctx.loading
        ? "正在读取成员信息"
        : __VLS_ctx.membersAvailable ? "当前没有活跃成员" : "成员信息不可用");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (!__VLS_ctx.hasLoaded && __VLS_ctx.loading
        ? "仅查询当前消费组，不会扫描其他消费组。"
        : __VLS_ctx.membersAvailable
            ? "消费组可能为空闲状态，已提交的 Offset 仍会在下方展示。"
            : "可能缺少 DescribeGroups 权限；Offset 和 Lag 查询不受影响。");
}
if (!__VLS_ctx.membersCollapsed && __VLS_ctx.membersAvailable && __VLS_ctx.members.length > __VLS_ctx.memberPageSize) {
    const __VLS_6 = AppPagination;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        page: (__VLS_ctx.memberPage),
        pageSize: (__VLS_ctx.memberPageSize),
        total: (__VLS_ctx.members.length),
    }));
    const __VLS_8 = __VLS_7({
        page: (__VLS_ctx.memberPage),
        pageSize: (__VLS_ctx.memberPageSize),
        total: (__VLS_ctx.members.length),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "data-card partition-card" },
});
/** @type {__VLS_StyleScopedClasses['data-card']} */ ;
/** @type {__VLS_StyleScopedClasses['partition-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "table-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['table-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "partition-toolbar-controls" },
});
/** @type {__VLS_StyleScopedClasses['partition-toolbar-controls']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.partitionFilter),
    'aria-label': "筛选分区",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "all",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "lagged",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "uncommitted",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "anomaly",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.partitionSort),
    'aria-label': "分区排序",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "lag_desc",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "partition",
});
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
            ...{ class: ({ 'offset-anomaly-row': __VLS_ctx.isOffsetAnomaly(item) }) },
        });
        /** @type {__VLS_StyleScopedClasses['offset-anomaly-row']} */ ;
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
        if (item.offsetStatus === 'commit_error') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "offset-status anomaly" },
            });
            /** @type {__VLS_StyleScopedClasses['offset-status']} */ ;
            /** @type {__VLS_StyleScopedClasses['anomaly']} */ ;
        }
        else if (item.hasCommitted) {
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "offset-status" },
            ...{ class: ({
                    normal: item.offsetStatus === 'normal',
                    uncommitted: item.offsetStatus === 'uncommitted',
                    anomaly: __VLS_ctx.isOffsetAnomaly(item),
                }) },
            title: (item.errorMessage || undefined),
        });
        /** @type {__VLS_StyleScopedClasses['offset-status']} */ ;
        /** @type {__VLS_StyleScopedClasses['normal']} */ ;
        /** @type {__VLS_StyleScopedClasses['uncommitted']} */ ;
        /** @type {__VLS_StyleScopedClasses['anomaly']} */ ;
        (__VLS_ctx.offsetStatusLabel(item));
        // @ts-ignore
        [loading, loading, hasLoaded, hasLoaded, membersAvailable, membersAvailable, membersAvailable, members, members, membersCollapsed, membersCollapsed, memberPageSize, memberPageSize, memberPage, keyword, partitionFilter, partitionSort, filteredPartitions, filteredPartitions, paginatedPartitions, isOffsetAnomaly, isOffsetAnomaly, offsetStatusLabel,];
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
    (__VLS_ctx.loading ? "正在读取分区进度" : __VLS_ctx.loadError ? "读取失败" : "没有符合条件的分区");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.loadError || (__VLS_ctx.loading ? "正在读取开始、当前和结束 Offset…" : "可以调整搜索、筛选或排序条件。"));
}
const __VLS_11 = AppPagination;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredPartitions.length),
}));
const __VLS_13 = __VLS_12({
    page: (__VLS_ctx.page),
    pageSize: (__VLS_ctx.pageSize),
    total: (__VLS_ctx.filteredPartitions.length),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
// @ts-ignore
[loading, loading, filteredPartitions, loadError, loadError, page, pageSize,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
