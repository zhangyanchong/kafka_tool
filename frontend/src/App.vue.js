import { closeDialog, dialog } from "./dialog";
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (__VLS_ctx.dialog) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.dialog))
                    throw 0;
                return (__VLS_ctx.dialog.alert ? __VLS_ctx.closeDialog(true) : __VLS_ctx.closeDialog(false));
                // @ts-ignore
                [dialog, dialog, closeDialog, closeDialog,];
            } },
        ...{ class: "app-dialog-backdrop" },
        role: "presentation",
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "app-dialog" },
        role: "alertdialog",
        'aria-modal': "true",
        'aria-labelledby': "app-dialog-title",
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "app-dialog-kicker" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-kicker']} */ ;
    (__VLS_ctx.dialog.danger ? '高风险操作' : '操作提示');
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        id: "app-dialog-title",
    });
    (__VLS_ctx.dialog.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "app-dialog-message" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-message']} */ ;
    (__VLS_ctx.dialog.message);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "app-dialog-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['app-dialog-actions']} */ ;
    if (!__VLS_ctx.dialog.alert) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.dialog))
                        throw 0;
                    if (!(!__VLS_ctx.dialog.alert))
                        throw 0;
                    return (__VLS_ctx.closeDialog(false));
                    // @ts-ignore
                    [dialog, dialog, dialog, dialog, closeDialog,];
                } },
            type: "button",
            ...{ class: "app-dialog-cancel" },
        });
        /** @type {__VLS_StyleScopedClasses['app-dialog-cancel']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.dialog))
                    throw 0;
                return (__VLS_ctx.closeDialog(true));
                // @ts-ignore
                [closeDialog,];
            } },
        type: "button",
        ...{ class: (__VLS_ctx.dialog.danger ? 'app-dialog-danger' : 'app-dialog-primary') },
    });
    (__VLS_ctx.dialog.confirmLabel);
}
// @ts-ignore
[dialog, dialog,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
