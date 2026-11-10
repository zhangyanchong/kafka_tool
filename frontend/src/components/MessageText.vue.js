import { computed, ref, watch } from "vue";
import { displayPageSize, messageDisplayPage, wrapMessageDisplay } from "@/utils/messageDisplay";
const props = defineProps();
const page = ref(0);
const pages = computed(() => Math.max(1, Math.ceil(props.value.length / displayPageSize)));
const display = computed(() => wrapMessageDisplay(messageDisplayPage(props.value, page.value)));
watch(() => props.value, () => { page.value = 0; });
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['message-text-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['message-text-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['message-text-pages']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: () => { } },
    ...{ class: "message-text-pages" },
});
/** @type {__VLS_StyleScopedClasses['message-text-pages']} */ ;
if (__VLS_ctx.pages > 1) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-text-controls" },
    });
    /** @type {__VLS_StyleScopedClasses['message-text-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.page + 1);
    (__VLS_ctx.pages);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pages > 1))
                    throw 0;
                return (__VLS_ctx.page--);
                // @ts-ignore
                [pages, pages, page, page,];
            } },
        type: "button",
        disabled: (__VLS_ctx.page === 0),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.pages > 1))
                    throw 0;
                return (__VLS_ctx.page++);
                // @ts-ignore
                [page, page,];
            } },
        type: "button",
        disabled: (__VLS_ctx.page + 1 >= __VLS_ctx.pages),
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.pre, __VLS_intrinsics.pre)({
    key: (__VLS_ctx.page),
});
(__VLS_ctx.display);
// @ts-ignore
[pages, page, page, display,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
