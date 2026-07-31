<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{
  "update:page": [page: number];
}>();

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const pages = computed(() => {
  const result: number[] = [];
  const start = Math.max(1, Math.min(props.page - 2, pageCount.value - 4));
  const end = Math.min(pageCount.value, start + 4);
  for (let page = start; page <= end; page += 1) result.push(page);
  return result;
});
const startItem = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1);
const endItem = computed(() => Math.min(props.page * props.pageSize, props.total));

function go(page: number) {
  if (page >= 1 && page <= pageCount.value && page !== props.page) {
    emit("update:page", page);
  }
}
</script>

<template>
  <footer class="pagination">
    <span>显示 {{ startItem }}–{{ endItem }}，共 {{ total }} 条</span>
    <div class="pagination-controls">
      <button type="button" :disabled="page <= 1" aria-label="上一页" @click="go(page - 1)">←</button>
      <button
        v-for="item in pages"
        :key="item"
        type="button"
        :class="{ active: item === page }"
        :aria-current="item === page ? 'page' : undefined"
        @click="go(item)"
      >
        {{ item }}
      </button>
      <button type="button" :disabled="page >= pageCount" aria-label="下一页" @click="go(page + 1)">→</button>
    </div>
    <span>每页 {{ pageSize }} 条</span>
  </footer>
</template>

