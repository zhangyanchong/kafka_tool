<script setup lang="ts">
import { computed } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { applyTheme, currentTheme, type AppTheme } from "@/theme";

const connection = useConnectionStore();
const connectionVerified = computed(() => connection.result?.success === true);
const themeOptions: Array<{ value: AppTheme; label: string; color: string }> = [
  { value: "dark", label: "深色", color: "#151920" },
  { value: "light", label: "浅色", color: "#f4f7f5" },
  { value: "forest", label: "墨绿", color: "#123522" },
];
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>Kafka Tool</span>
      </div>

      <nav class="main-nav" aria-label="主菜单">
        <RouterLink to="/dashboard/topics">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 6.5h14M5 12h14M5 17.5h14" />
            <circle cx="8" cy="6.5" r="1.5" />
            <circle cx="16" cy="12" r="1.5" />
            <circle cx="10" cy="17.5" r="1.5" />
          </svg>
          <span>Topic</span>
        </RouterLink>
        <RouterLink to="/dashboard/consumers">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16M7 4.5h10M7 19.5h10M4 16h16" />
            <path d="M8 8v8M16 8v8" />
          </svg>
          <span>Consumer</span>
        </RouterLink>
        <RouterLink to="/dashboard/view">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18V9M10 18V5M16 18v-7M22 18V3" />
            <path d="M3 18h20" />
          </svg>
          <span>监控</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">
        <span :class="['status-dot', { unverified: !connectionVerified }]"></span>
        <div>
          <strong>{{ connectionVerified ? "连接已验证" : "连接未验证" }}</strong>
          <small>{{ connection.form.brokers.length }} 个接入地址</small>
        </div>
      </div>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div class="cluster-heading">
          <span>当前连接</span>
          <strong>{{ connection.displayName }}</strong>
        </div>
        <div class="topbar-actions">
          <div class="theme-switch" aria-label="界面主题">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              type="button"
              :class="{ active: currentTheme === option.value }"
              :aria-pressed="currentTheme === option.value"
              :title="`${option.label}主题`"
              @click="applyTheme(option.value)"
            >
              <i :style="{ background: option.color }"></i>{{ option.label }}
            </button>
          </div>
          <div :class="['connected-badge', { unverified: !connectionVerified }]">
            <i></i>{{ connectionVerified ? "VERIFIED" : "UNVERIFIED" }}
          </div>
          <RouterLink class="switch-link" to="/connect">切换连接</RouterLink>
        </div>
      </header>
      <main class="page-content">
        <RouterView />
      </main>
    </section>
  </div>
</template>
