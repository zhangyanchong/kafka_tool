<script setup lang="ts">
import { useConnectionStore } from "@/stores/connection";

const connection = useConnectionStore();
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
          <span>View</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">
        <span class="status-dot"></span>
        <div>
          <strong>连接正常</strong>
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
          <div class="connected-badge"><i></i>CONNECTED</div>
          <RouterLink class="switch-link" to="/connect">切换连接</RouterLink>
        </div>
      </header>
      <main class="page-content">
        <RouterView />
      </main>
    </section>
  </div>
</template>
