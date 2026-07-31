import { computed } from "vue";
const props = defineProps();
const emit = defineEmits();
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const pages = computed(() => {
    const result = [];
    const start = Math.max(1, Math.min(props.page - 2, pageCount.value - 4));
    const end = Math.min(pageCount.value, start + 4);
    for (let page = start; page <= end; page += 1)
        result.push(page);
    return result;
});
const startItem = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1);
const endItem = computed(() => Math.min(props.page * props.pageSize, props.total));
function go(page) {
    if (page >= 1 && page <= pageCount.value && page !== props.page) {
        emit("update:page", page);
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
    ...{ class: "pagination" },
});
/** @type {__VLS_StyleScopedClasses['pagination']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.startItem);
(__VLS_ctx.endItem);
(__VLS_ctx.total);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "pagination-controls" },
});
/** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.go(__VLS_ctx.page - 1));
            // @ts-ignore
            [startItem, endItem, total, go, page,];
        } },
    type: "button",
    disabled: (__VLS_ctx.page <= 1),
    'aria-label': "上一页",
});
for (const [item] of __VLS_vFor((__VLS_ctx.pages))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                return (__VLS_ctx.go(item));
                // @ts-ignore
                [go, page, pages,];
            } },
        key: (item),
        type: "button",
        ...{ class: ({ active: item === __VLS_ctx.page }) },
        'aria-current': (item === __VLS_ctx.page ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (item);
    // @ts-ignore
    [page, page,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.go(__VLS_ctx.page + 1));
            // @ts-ignore
            [go, page,];
        } },
    type: "button",
    disabled: (__VLS_ctx.page >= __VLS_ctx.pageCount),
    'aria-label': "下一页",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.pageSize);
// @ts-ignore
[page, pageCount, pageSize,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
