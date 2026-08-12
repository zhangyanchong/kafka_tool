import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { currentTheme, renderTheme } from "@/theme";
import { decodeBase64, encodeBase64 } from "@/utils/base64";
import { expandEmbeddedJson } from "@/utils/json";
const props = withDefaults(defineProps(), {
    embedded: false,
});
const activeTool = ref("json");
const input = ref("");
const output = ref("");
const error = ref("");
const copied = ref(false);
const base64Input = ref("");
const base64Output = ref("");
const base64Error = ref("");
const base64Copied = ref(false);
const inputLength = computed(() => input.value.length);
const outputLength = computed(() => output.value.length);
const base64InputLength = computed(() => base64Input.value.length);
const base64OutputLength = computed(() => base64Output.value.length);
onMounted(() => {
    if (!props.embedded)
        renderTheme("light");
});
onBeforeUnmount(() => {
    if (!props.embedded)
        renderTheme(currentTheme.value);
});
function parseJson() {
    if (!input.value.trim())
        throw new Error("请先输入 JSON 内容");
    return JSON.parse(input.value);
}
function formatJson() {
    try {
        output.value = JSON.stringify(parseJson(), null, 2);
        error.value = "";
    }
    catch (reason) {
        error.value = reason instanceof Error ? `JSON 格式错误：${reason.message}` : "JSON 格式错误";
    }
}
function minifyJson() {
    try {
        output.value = JSON.stringify(parseJson());
        error.value = "";
    }
    catch (reason) {
        error.value = reason instanceof Error ? `JSON 格式错误：${reason.message}` : "JSON 格式错误";
    }
}
function formatEmbeddedJson() {
    try {
        const expanded = expandEmbeddedJson(parseJson());
        output.value = JSON.stringify(expanded.value, null, 2);
        error.value = "";
    }
    catch (reason) {
        error.value = reason instanceof Error ? `JSON 格式错误：${reason.message}` : "JSON 格式错误";
    }
}
function removeEscapeSlashes() {
    let value = input.value.trim();
    if (!value) {
        error.value = "请先输入 JSON 内容";
        return;
    }
    try {
        for (let index = 0; index < 3; index += 1) {
            try {
                const parsed = JSON.parse(value);
                if (typeof parsed === "string") {
                    value = parsed.trim();
                    try {
                        JSON.parse(value);
                        continue;
                    }
                    catch {
                        output.value = parsed;
                        error.value = "";
                        return;
                    }
                }
                output.value = JSON.stringify(parsed, null, 2);
                error.value = "";
                return;
            }
            catch {
                const unescaped = value.replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
                if (unescaped === value)
                    throw new Error("无法识别需要去除的转义斜杠");
                value = unescaped;
            }
        }
        output.value = value;
        error.value = "";
    }
    catch (reason) {
        error.value = reason instanceof Error ? reason.message : "处理失败";
    }
}
function clearAll() {
    input.value = "";
    output.value = "";
    error.value = "";
    copied.value = false;
}
async function copyOutput() {
    if (!output.value)
        return;
    try {
        await navigator.clipboard.writeText(output.value);
        copied.value = true;
        error.value = "";
        window.setTimeout(() => (copied.value = false), 1200);
    }
    catch {
        error.value = "复制失败，请手动选择结果内容复制";
    }
}
function encodeBase64Text() {
    if (!base64Input.value) {
        base64Error.value = "请先输入需要编码的文本";
        return;
    }
    base64Output.value = encodeBase64(base64Input.value);
    base64Error.value = "";
}
function decodeBase64Text() {
    if (!base64Input.value.trim()) {
        base64Error.value = "请先输入需要解码的 Base64 内容";
        return;
    }
    try {
        base64Output.value = decodeBase64(base64Input.value);
        base64Error.value = "";
    }
    catch (reason) {
        base64Error.value = reason instanceof Error ? reason.message : "Base64 解码失败";
    }
}
function clearBase64() {
    base64Input.value = "";
    base64Output.value = "";
    base64Error.value = "";
    base64Copied.value = false;
}
async function copyBase64Output() {
    if (!base64Output.value)
        return;
    try {
        await navigator.clipboard.writeText(base64Output.value);
        base64Copied.value = true;
        base64Error.value = "";
        window.setTimeout(() => (base64Copied.value = false), 1200);
    }
    catch {
        base64Error.value = "复制失败，请手动选择结果内容复制";
    }
}
const __VLS_defaults = {
    embedded: false,
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: (['tools-page', { embedded: __VLS_ctx.embedded }]) },
});
/** @type {__VLS_StyleScopedClasses['embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-page']} */ ;
if (!__VLS_ctx.embedded) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "tools-sidebar" },
    });
    /** @type {__VLS_StyleScopedClasses['tools-sidebar']} */ ;
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
        ...{ class: "tools-nav" },
        'aria-label': "工具菜单",
    });
    /** @type {__VLS_StyleScopedClasses['tools-nav']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.embedded))
                    throw 0;
                return (__VLS_ctx.activeTool = 'json');
                // @ts-ignore
                [embedded, embedded, activeTool,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeTool === 'json' }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.embedded))
                    throw 0;
                return (__VLS_ctx.activeTool = 'base64');
                // @ts-ignore
                [activeTool, activeTool,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeTool === 'base64' }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ class: "tools-home-link" },
        to: "/",
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: "tools-home-link" },
        to: "/",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['tools-home-link']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    // @ts-ignore
    [activeTool,];
    var __VLS_3;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "tools-workspace" },
});
/** @type {__VLS_StyleScopedClasses['tools-workspace']} */ ;
if (!__VLS_ctx.embedded) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "tools-topbar" },
    });
    /** @type {__VLS_StyleScopedClasses['tools-topbar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.activeTool === "json" ? "JSON TOOL" : "BASE64 TOOL");
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.activeTool === "json" ? "JSON 格式化" : "Base64 编解码");
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        ...{ class: "embedded-tools-nav" },
        'aria-label': "常用工具类型",
    });
    /** @type {__VLS_StyleScopedClasses['embedded-tools-nav']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.embedded))
                    throw 0;
                return (__VLS_ctx.activeTool = 'json');
                // @ts-ignore
                [embedded, activeTool, activeTool, activeTool,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeTool === 'json' }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.embedded))
                    throw 0;
                return (__VLS_ctx.activeTool = 'base64');
                // @ts-ignore
                [activeTool, activeTool,];
            } },
        ...{ class: ({ active: __VLS_ctx.activeTool === 'base64' }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
if (__VLS_ctx.activeTool === 'json') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tools-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tools-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tools-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['tools-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "json-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['json-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.formatJson) },
        ...{ class: "primary" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.formatEmbeddedJson) },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.minifyJson) },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.removeEscapeSlashes) },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.clearAll) },
        ...{ class: "quiet" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['quiet']} */ ;
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "notice error tools-error" },
        });
        /** @type {__VLS_StyleScopedClasses['notice']} */ ;
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        /** @type {__VLS_StyleScopedClasses['tools-error']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.error);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "json-editor-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['json-editor-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "json-editor" },
    });
    /** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.inputLength);
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.input),
        spellcheck: "false",
        placeholder: '\u7c98\u8d34\u0020\u004a\u0053\u004f\u004e\uff0c\u4f8b\u5982\uff1a\u007b\u005c\u0022\u006e\u0061\u006d\u0065\u005c\u0022\u003a\u0020\u005c\u0022\u004b\u0061\u0066\u006b\u0061\u0020\u0054\u006f\u006f\u006c\u005c\u0022\u007d',
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "json-editor" },
    });
    /** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.outputLength);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.copyOutput) },
        type: "button",
        disabled: (!__VLS_ctx.output),
    });
    (__VLS_ctx.copied ? "已复制" : "复制");
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.output),
        readonly: true,
        spellcheck: "false",
        placeholder: "处理结果会显示在这里",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tools-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tools-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tools-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['tools-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "json-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['json-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.encodeBase64Text) },
        ...{ class: "primary" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.decodeBase64Text) },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.clearBase64) },
        ...{ class: "quiet" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['quiet']} */ ;
    if (__VLS_ctx.base64Error) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "notice error tools-error" },
        });
        /** @type {__VLS_StyleScopedClasses['notice']} */ ;
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        /** @type {__VLS_StyleScopedClasses['tools-error']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.base64Error);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "json-editor-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['json-editor-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "json-editor" },
    });
    /** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.base64InputLength);
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.base64Input),
        spellcheck: "false",
        placeholder: "输入原始文本进行编码，或粘贴 Base64 内容进行解码",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "json-editor" },
    });
    /** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.base64OutputLength);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.copyBase64Output) },
        type: "button",
        disabled: (!__VLS_ctx.base64Output),
    });
    (__VLS_ctx.base64Copied ? "已复制" : "复制");
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.base64Output),
        readonly: true,
        spellcheck: "false",
        placeholder: "处理结果会显示在这里",
    });
}
// @ts-ignore
[activeTool, activeTool, formatJson, formatEmbeddedJson, minifyJson, removeEscapeSlashes, clearAll, error, error, inputLength, input, outputLength, copyOutput, output, output, copied, encodeBase64Text, decodeBase64Text, clearBase64, base64Error, base64Error, base64InputLength, base64Input, base64OutputLength, copyBase64Output, base64Output, base64Output, base64Copied,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
    props: {},
});
export default {};
