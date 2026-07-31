<script setup lang="ts">
import { computed } from "vue";

interface ChartSeries {
  name: string;
  color: string;
  values: number[];
  axis?: "left" | "right";
  dash?: string;
}

const props = defineProps<{
  labels: string[];
  series: ChartSeries[];
  valueSuffix?: string;
  zeroBased?: boolean;
}>();

const width = 760;
const height = 250;
const padding = { top: 22, right: 62, bottom: 34, left: 62 };
const plotWidth = width - padding.left - padding.right;
const plotHeight = height - padding.top - padding.bottom;
const hasData = computed(() => props.series.some((item) => item.values.length));

const leftValues = computed(() =>
  props.series.filter((item) => item.axis !== "right").flatMap((item) => item.values),
);
const rightValues = computed(() =>
  props.series.filter((item) => item.axis === "right").flatMap((item) => item.values),
);
const hasRightAxis = computed(() => rightValues.value.length > 0);
const leftMax = computed(() => Math.max(1, ...leftValues.value));
const leftMin = computed(() => {
  if (props.zeroBased !== false || leftValues.value.length === 0) return 0;
  const minimum = Math.min(...leftValues.value);
  const maximum = leftMax.value;
  const margin = Math.max(1, (maximum - minimum) * 0.12);
  return Math.max(0, minimum - margin);
});
const leftRange = computed(() => Math.max(1, leftMax.value - leftMin.value));
const rightMax = computed(() => Math.max(1, ...rightValues.value));
const rightMin = computed(() => 0);
const rightRange = computed(() => Math.max(1, rightMax.value - rightMin.value));
const leftGridValues = computed(() =>
  Array.from({ length: 5 }, (_, index) =>
    leftMax.value - (leftRange.value * index) / 4,
  ),
);
const rightGridValues = computed(() =>
  Array.from({ length: 5 }, (_, index) =>
    rightMax.value - (rightRange.value * index) / 4,
  ),
);

function x(index: number) {
  if (props.labels.length <= 1) return padding.left + plotWidth / 2;
  return padding.left + (index / (props.labels.length - 1)) * plotWidth;
}

function y(value: number, axis: "left" | "right" = "left") {
  if (axis === "right") {
    return padding.top + ((rightMax.value - value) / rightRange.value) * plotHeight;
  }
  return padding.top + ((leftMax.value - value) / leftRange.value) * plotHeight;
}

function points(series: ChartSeries) {
  return series.values.map((value, index) => `${x(index)},${y(value, series.axis)}`).join(" ");
}

function compact(value: number) {
  return Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
</script>

<template>
  <div class="line-chart">
    <div v-if="hasData" class="chart-legend">
      <span v-for="item in series" :key="item.name"><i :style="{ background: item.color }"></i>{{ item.name }}</span>
    </div>
    <svg v-if="hasData" :viewBox="`0 0 ${width} ${height}`" role="img" aria-label="指标趋势图">
      <g v-for="(value, index) in leftGridValues" :key="index">
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="padding.top + index * plotHeight / 4"
          :y2="padding.top + index * plotHeight / 4"
          class="chart-grid-line"
        />
        <text :x="padding.left - 10" :y="padding.top + index * plotHeight / 4 + 3" text-anchor="end" class="chart-axis-text">
          {{ compact(value) }}{{ valueSuffix || "" }}
        </text>
        <text
          v-if="hasRightAxis"
          :x="width - padding.right + 10"
          :y="padding.top + index * plotHeight / 4 + 3"
          text-anchor="start"
          class="chart-axis-text right"
        >
          {{ compact(rightGridValues[index]) }}
        </text>
      </g>
      <template v-if="labels.length">
        <text :x="padding.left" :y="height - 9" class="chart-axis-text">{{ labels[0] }}</text>
        <text :x="width - padding.right" :y="height - 9" text-anchor="end" class="chart-axis-text">{{ labels[labels.length - 1] }}</text>
      </template>
      <g v-for="item in series" :key="item.name">
        <polyline
          v-if="item.values.length > 1"
          :points="points(item)"
          fill="none"
          :stroke="item.color"
          stroke-width="2.2"
          :stroke-dasharray="item.dash"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="(value, index) in item.values"
          :key="index"
          :cx="x(index)"
          :cy="y(value, item.axis)"
          r="2.8"
          :fill="item.color"
        />
      </g>
    </svg>
    <div v-if="!hasData" class="chart-waiting">等待完成首个采样周期…</div>
    <div v-else-if="labels.length < 2" class="chart-waiting">等待下一个采样点生成趋势线…</div>
  </div>
</template>
