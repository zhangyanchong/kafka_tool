<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { displayPageSize, messageDisplayPage, wrapMessageDisplay } from "@/utils/messageDisplay";
const props = defineProps<{ value: string }>();
const page = ref(0);
const pages = computed(() => Math.max(1, Math.ceil(props.value.length / displayPageSize)));
const display = computed(() => wrapMessageDisplay(messageDisplayPage(props.value, page.value)));
watch(() => props.value, () => { page.value = 0; });
</script>

<template>
  <div class="message-text-pages" @click.stop>
    <div v-if="pages > 1" class="message-text-controls">
      <span>长消息分段显示 · {{ page + 1 }} / {{ pages }} 段；“复制内容”复制完整原文</span>
      <button type="button" :disabled="page === 0" @click="page--">上一段</button>
      <button type="button" :disabled="page + 1 >= pages" @click="page++">下一段</button>
    </div>
    <pre :key="page">{{ display }}</pre>
  </div>
</template>

<style scoped>
.message-text-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px 110px 10px 15px; font-size: 11px; }
.message-text-pages .message-text-controls button { position: static; flex: 0 0 auto; }
.message-text-controls button:disabled { opacity: .45; cursor: default; }
.message-text-pages pre { min-width: 0; max-width: 100%; box-sizing: border-box; white-space: pre-wrap; overflow-wrap: anywhere; word-break: normal; }
</style>
