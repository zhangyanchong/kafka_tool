import { computed } from "vue";
const props = defineProps();
const width = 760;
const height = 250;
const padding = { top: 22, right: 62, bottom: 34, left: 62 };
const plotWidth = width - padding.left - padding.right;
const plotHeight = height - padding.top - padding.bottom;
const hasData = computed(() => props.series.some((item) => item.values.length));
const leftValues = computed(() => props.series.filter((item) => item.axis !== "right").flatMap((item) => item.values));
const rightValues = computed(() => props.series.filter((item) => item.axis === "right").flatMap((item) => item.values));
const hasRightAxis = computed(() => rightValues.value.length > 0);
const leftMax = computed(() => Math.max(1, ...leftValues.value));
const leftMin = computed(() => {
    if (props.zeroBased !== false || leftValues.value.length === 0)
        return 0;
    const minimum = Math.min(...leftValues.value);
    const maximum = leftMax.value;
    const margin = Math.max(1, (maximum - minimum) * 0.12);
    return Math.max(0, minimum - margin);
});
const leftRange = computed(() => Math.max(1, leftMax.value - leftMin.value));
const rightMax = computed(() => Math.max(1, ...rightValues.value));
const rightMin = computed(() => 0);
const rightRange = computed(() => Math.max(1, rightMax.value - rightMin.value));
const leftGridValues = computed(() => Array.from({ length: 5 }, (_, index) => leftMax.value - (leftRange.value * index) / 4));
const rightGridValues = computed(() => Array.from({ length: 5 }, (_, index) => rightMax.value - (rightRange.value * index) / 4));
function x(index) {
    if (props.labels.length <= 1)
        return padding.left + plotWidth / 2;
    return padding.left + (index / (props.labels.length - 1)) * plotWidth;
}
function y(value, axis = "left") {
    if (axis === "right") {
        return padding.top + ((rightMax.value - value) / rightRange.value) * plotHeight;
    }
    return padding.top + ((leftMax.value - value) / leftRange.value) * plotHeight;
}
function points(series) {
    return series.values.map((value, index) => `${x(index)},${y(value, series.axis)}`).join(" ");
}
function compact(value) {
    return Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "line-chart" },
});
/** @type {__VLS_StyleScopedClasses['line-chart']} */ ;
if (__VLS_ctx.hasData) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-legend" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-legend']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.series))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (item.name),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ style: ({ background: item.color }) },
        });
        (item.name);
        // @ts-ignore
        [hasData, series,];
    }
}
if (__VLS_ctx.hasData) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: (`0 0 ${__VLS_ctx.width} ${__VLS_ctx.height}`),
        role: "img",
        'aria-label': "指标趋势图",
    });
    for (const [value, index] of __VLS_vFor((__VLS_ctx.leftGridValues))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
            key: (index),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            x1: (__VLS_ctx.padding.left),
            x2: (__VLS_ctx.width - __VLS_ctx.padding.right),
            y1: (__VLS_ctx.padding.top + index * __VLS_ctx.plotHeight / 4),
            y2: (__VLS_ctx.padding.top + index * __VLS_ctx.plotHeight / 4),
            ...{ class: "chart-grid-line" },
        });
        /** @type {__VLS_StyleScopedClasses['chart-grid-line']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
            x: (__VLS_ctx.padding.left - 10),
            y: (__VLS_ctx.padding.top + index * __VLS_ctx.plotHeight / 4 + 3),
            'text-anchor': "end",
            ...{ class: "chart-axis-text" },
        });
        /** @type {__VLS_StyleScopedClasses['chart-axis-text']} */ ;
        (__VLS_ctx.compact(value));
        (__VLS_ctx.valueSuffix || "");
        if (__VLS_ctx.hasRightAxis) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
                x: (__VLS_ctx.width - __VLS_ctx.padding.right + 10),
                y: (__VLS_ctx.padding.top + index * __VLS_ctx.plotHeight / 4 + 3),
                'text-anchor': "start",
                ...{ class: "chart-axis-text right" },
            });
            /** @type {__VLS_StyleScopedClasses['chart-axis-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['right']} */ ;
            (__VLS_ctx.compact(__VLS_ctx.rightGridValues[index]));
        }
        // @ts-ignore
        [hasData, width, width, width, height, leftGridValues, padding, padding, padding, padding, padding, padding, padding, padding, plotHeight, plotHeight, plotHeight, plotHeight, compact, compact, valueSuffix, hasRightAxis, rightGridValues,];
    }
    if (__VLS_ctx.labels.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
            x: (__VLS_ctx.padding.left),
            y: (__VLS_ctx.height - 9),
            ...{ class: "chart-axis-text" },
        });
        /** @type {__VLS_StyleScopedClasses['chart-axis-text']} */ ;
        (__VLS_ctx.labels[0]);
        __VLS_asFunctionalElement1(__VLS_intrinsics.text, __VLS_intrinsics.text)({
            x: (__VLS_ctx.width - __VLS_ctx.padding.right),
            y: (__VLS_ctx.height - 9),
            'text-anchor': "end",
            ...{ class: "chart-axis-text" },
        });
        /** @type {__VLS_StyleScopedClasses['chart-axis-text']} */ ;
        (__VLS_ctx.labels[__VLS_ctx.labels.length - 1]);
    }
    for (const [item] of __VLS_vFor((__VLS_ctx.series))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.g, __VLS_intrinsics.g)({
            key: (item.name),
        });
        if (item.values.length > 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
                points: (__VLS_ctx.points(item)),
                fill: "none",
                stroke: (item.color),
                'stroke-width': "2.2",
                'stroke-dasharray': (item.dash),
                'stroke-linejoin': "round",
                'stroke-linecap': "round",
            });
        }
        for (const [value, index] of __VLS_vFor((item.values))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                key: (index),
                cx: (__VLS_ctx.x(index)),
                cy: (__VLS_ctx.y(value, item.axis)),
                r: "2.8",
                fill: (item.color),
            });
            // @ts-ignore
            [series, width, height, height, padding, padding, labels, labels, labels, labels, points, x, y,];
        }
        // @ts-ignore
        [];
    }
}
if (!__VLS_ctx.hasData) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-waiting" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-waiting']} */ ;
}
else if (__VLS_ctx.labels.length < 2) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chart-waiting" },
    });
    /** @type {__VLS_StyleScopedClasses['chart-waiting']} */ ;
}
// @ts-ignore
[hasData, labels,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
