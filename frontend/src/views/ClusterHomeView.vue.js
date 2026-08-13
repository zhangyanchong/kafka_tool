import { onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { currentTheme, renderTheme } from "@/theme";
const store = useConnectionStore();
const router = useRouter();
onMounted(() => renderTheme("light"));
onBeforeUnmount(() => renderTheme(currentTheme.value));
function enterCluster(id) {
    if (!store.activate(id))
        return;
    if ((store.usesSasl && !store.form.password) || (store.form.sshEnabled && !store.form.sshPassword)) {
        router.push({ path: "/connect", query: { id } });
        return;
    }
    router.push("/dashboard");
}
function editCluster(id) {
    router.push({ path: "/connect", query: { id, mode: "edit" } });
}
function deleteCluster(id, name) {
    if (!window.confirm(`确定删除集群“${name}”吗？\n\n此操作只会删除本地保存的连接配置，不会影响 Kafka 服务端数据。`)) {
        return;
    }
    store.deleteConnection(id);
}
function formatTime(value) {
    if (!value)
        return "尚未验证";
    return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "cluster-home" },
});
/** @type {__VLS_StyleScopedClasses['cluster-home']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "cluster-home-header" },
});
/** @type {__VLS_StyleScopedClasses['cluster-home-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-mark" },
});
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cluster-home-actions" },
});
/** @type {__VLS_StyleScopedClasses['cluster-home-actions']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "tools-link-button" },
    to: "/tools",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "tools-link-button" },
    to: "/tools",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['tools-link-button']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M8 6h8M8 12h8M8 18h8",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "4",
    cy: "6",
    r: "1",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "4",
    cy: "12",
    r: "1",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "4",
    cy: "18",
    r: "1",
});
var __VLS_3;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    ...{ class: "add-cluster-button" },
    to: "/connect",
}));
const __VLS_8 = __VLS_7({
    ...{ class: "add-cluster-button" },
    to: "/connect",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
/** @type {__VLS_StyleScopedClasses['add-cluster-button']} */ ;
const { default: __VLS_11 } = __VLS_9.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
var __VLS_9;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "cluster-home-content" },
});
/** @type {__VLS_StyleScopedClasses['cluster-home-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cluster-home-heading" },
});
/** @type {__VLS_StyleScopedClasses['cluster-home-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
if (__VLS_ctx.store.connections.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cluster-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['cluster-grid']} */ ;
    for (const [connection] of __VLS_vFor((__VLS_ctx.store.connections))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.connections.length))
                        throw 0;
                    return (__VLS_ctx.enterCluster(connection.id));
                    // @ts-ignore
                    [store, store, enterCluster,];
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!(__VLS_ctx.store.connections.length))
                        throw 0;
                    return (__VLS_ctx.enterCluster(connection.id));
                    // @ts-ignore
                    [enterCluster,];
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!(__VLS_ctx.store.connections.length))
                        throw 0;
                    return (__VLS_ctx.enterCluster(connection.id));
                    // @ts-ignore
                    [enterCluster,];
                } },
            key: (connection.id),
            ...{ class: "cluster-card" },
            tabindex: "0",
            role: "button",
        });
        /** @type {__VLS_StyleScopedClasses['cluster-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "cluster-card-top" },
        });
        /** @type {__VLS_StyleScopedClasses['cluster-card-top']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "cluster-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['cluster-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "cluster-card-controls" },
        });
        /** @type {__VLS_StyleScopedClasses['cluster-card-controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "cluster-status" },
        });
        /** @type {__VLS_StyleScopedClasses['cluster-status']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "cluster-card-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['cluster-card-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.connections.length))
                        throw 0;
                    return (__VLS_ctx.editCluster(connection.id));
                    // @ts-ignore
                    [editCluster,];
                } },
            type: "button",
            'aria-label': (`修改 ${connection.config.name || connection.config.brokers[0] || 'Kafka 集群'}`),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.connections.length))
                        throw 0;
                    return (__VLS_ctx.deleteCluster(connection.id, connection.config.name || connection.config.brokers[0] || 'Kafka 集群'));
                    // @ts-ignore
                    [deleteCluster,];
                } },
            ...{ class: "danger" },
            type: "button",
            'aria-label': (`删除 ${connection.config.name || connection.config.brokers[0] || 'Kafka 集群'}`),
        });
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "cluster-card-main" },
        });
        /** @type {__VLS_StyleScopedClasses['cluster-card-main']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        (connection.config.name || connection.config.brokers[0] || "Kafka 集群");
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (connection.config.brokers.join(" · "));
        __VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (connection.brokerCount || connection.config.brokers.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.formatTime(connection.lastConnectedAt));
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
        // @ts-ignore
        [formatTime,];
    }
    let __VLS_12;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        ...{ class: "cluster-card add-card" },
        to: "/connect",
    }));
    const __VLS_14 = __VLS_13({
        ...{ class: "cluster-card add-card" },
        to: "/connect",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    /** @type {__VLS_StyleScopedClasses['cluster-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['add-card']} */ ;
    const { default: __VLS_17 } = __VLS_15.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "add-card-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['add-card-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    // @ts-ignore
    [];
    var __VLS_15;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cluster-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['cluster-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "add-card-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['add-card-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    let __VLS_18;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        ...{ class: "add-cluster-button" },
        to: "/connect",
    }));
    const __VLS_20 = __VLS_19({
        ...{ class: "add-cluster-button" },
        to: "/connect",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    /** @type {__VLS_StyleScopedClasses['add-cluster-button']} */ ;
    const { default: __VLS_23 } = __VLS_21.slots;
    // @ts-ignore
    [];
    var __VLS_21;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
