import { computed } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { applyTheme, currentTheme } from "@/theme";
const connection = useConnectionStore();
const connectionVerified = computed(() => connection.result?.success === true);
const themeOptions = [
    { value: "dark", label: "深色", color: "#151920" },
    { value: "light", label: "浅色", color: "#f4f7f5" },
    { value: "forest", label: "墨绿", color: "#123522" },
];
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-shell" },
});
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "sidebar" },
});
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-brand" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-mark" },
});
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "main-nav" },
    'aria-label': "主菜单",
});
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "/dashboard/topics",
}));
const __VLS_2 = __VLS_1({
    to: "/dashboard/topics",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M5 6.5h14M5 12h14M5 17.5h14",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "8",
    cy: "6.5",
    r: "1.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "16",
    cy: "12",
    r: "1.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "10",
    cy: "17.5",
    r: "1.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
var __VLS_3;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    to: "/dashboard/consumers",
}));
const __VLS_8 = __VLS_7({
    to: "/dashboard/consumers",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M4 8h16M7 4.5h10M7 19.5h10M4 16h16",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M8 8v8M16 8v8",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
var __VLS_9;
let __VLS_12;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    to: "/dashboard/view",
}));
const __VLS_14 = __VLS_13({
    to: "/dashboard/view",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const { default: __VLS_17 } = __VLS_15.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M4 18V9M10 18V5M16 18v-7M22 18V3",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M3 18h20",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
var __VLS_15;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-foot" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-foot']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: (['status-dot', { unverified: !__VLS_ctx.connectionVerified }]) },
});
/** @type {__VLS_StyleScopedClasses['unverified']} */ ;
/** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.connectionVerified ? "连接已验证" : "连接未验证");
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
(__VLS_ctx.connection.form.brokers.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "workspace" },
});
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "topbar" },
});
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cluster-heading" },
});
/** @type {__VLS_StyleScopedClasses['cluster-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.connection.displayName);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "topbar-actions" },
});
/** @type {__VLS_StyleScopedClasses['topbar-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "theme-switch" },
    'aria-label': "界面主题",
});
/** @type {__VLS_StyleScopedClasses['theme-switch']} */ ;
for (const [option] of __VLS_vFor((__VLS_ctx.themeOptions))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                return (__VLS_ctx.applyTheme(option.value));
                // @ts-ignore
                [connectionVerified, connectionVerified, connection, connection, themeOptions, applyTheme,];
            } },
        key: (option.value),
        type: "button",
        ...{ class: ({ active: __VLS_ctx.currentTheme === option.value }) },
        'aria-pressed': (__VLS_ctx.currentTheme === option.value),
        title: (`${option.label}主题`),
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ style: ({ background: option.color }) },
    });
    (option.label);
    // @ts-ignore
    [currentTheme, currentTheme,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: (['connected-badge', { unverified: !__VLS_ctx.connectionVerified }]) },
});
/** @type {__VLS_StyleScopedClasses['unverified']} */ ;
/** @type {__VLS_StyleScopedClasses['connected-badge']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
(__VLS_ctx.connectionVerified ? "VERIFIED" : "UNVERIFIED");
let __VLS_18;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
    ...{ class: "switch-link" },
    to: "/",
}));
const __VLS_20 = __VLS_19({
    ...{ class: "switch-link" },
    to: "/",
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
/** @type {__VLS_StyleScopedClasses['switch-link']} */ ;
const { default: __VLS_23 } = __VLS_21.slots;
// @ts-ignore
[connectionVerified, connectionVerified,];
var __VLS_21;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "page-content" },
});
/** @type {__VLS_StyleScopedClasses['page-content']} */ ;
let __VLS_24;
/** @ts-ignore @type { | typeof __VLS_components.RouterView | typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
{
    const { default: __VLS_29 } = __VLS_27.slots;
    const [{ Component, route }] = __VLS_vSlot(__VLS_29);
    let __VLS_30;
    /** @ts-ignore @type { | typeof __VLS_components.KeepAlive | typeof __VLS_components.KeepAlive} */
    KeepAlive;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({}));
    const __VLS_32 = __VLS_31({}, ...__VLS_functionalComponentArgsRest(__VLS_31));
    const { default: __VLS_35 } = __VLS_33.slots;
    if (route.meta.keepAlive) {
        const __VLS_36 = (Component);
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({}));
        const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
    // @ts-ignore
    [];
    var __VLS_33;
    if (!route.meta.keepAlive) {
        const __VLS_41 = (Component);
        // @ts-ignore
        const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({}));
        const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
    }
    // @ts-ignore
    [];
    __VLS_27.slots['' /* empty slot name completion */];
}
var __VLS_27;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
