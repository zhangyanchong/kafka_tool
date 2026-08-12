<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { currentTheme, renderTheme } from "@/theme";

const store = useConnectionStore();
const router = useRouter();

onMounted(() => renderTheme("light"));
onBeforeUnmount(() => renderTheme(currentTheme.value));

function enterCluster(id: string) {
  if (!store.activate(id)) return;
  if (store.usesSasl && !store.form.password) {
    router.push({ path: "/connect", query: { id } });
    return;
  }
  router.push("/dashboard");
}

function formatTime(value: string) {
  if (!value) return "尚未验证";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
</script>

<template>
  <main class="cluster-home">
    <header class="cluster-home-header">
      <div class="brand">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>Kafka Tool</span>
      </div>
      <RouterLink class="add-cluster-button" to="/connect">
        <span>＋</span> 添加集群
      </RouterLink>
    </header>

    <section class="cluster-home-content">
      <div class="cluster-home-heading">
        <span class="eyebrow">CLUSTERS</span>
        <h1>选择 Kafka 集群</h1>
        <p>选择一个已保存的集群进入管理，或添加新的连接。</p>
      </div>

      <div v-if="store.connections.length" class="cluster-grid">
        <button
          v-for="connection in store.connections"
          :key="connection.id"
          class="cluster-card"
          type="button"
          @click="enterCluster(connection.id)"
        >
          <div class="cluster-card-top">
            <span class="cluster-icon">
              <i></i><i></i><i></i>
            </span>
            <span class="cluster-status"><i></i> 已保存</span>
          </div>
          <div class="cluster-card-main">
            <h2>{{ connection.config.name || connection.config.brokers[0] || "Kafka 集群" }}</h2>
            <p>{{ connection.config.brokers.join(" · ") }}</p>
          </div>
          <footer>
            <span>{{ connection.brokerCount || connection.config.brokers.length }} 个 Broker</span>
            <span>上次连接 {{ formatTime(connection.lastConnectedAt) }}</span>
            <b>→</b>
          </footer>
        </button>

        <RouterLink class="cluster-card add-card" to="/connect">
          <span class="add-card-icon">＋</span>
          <strong>添加 Kafka 集群</strong>
          <small>配置 Broker 与连接认证</small>
        </RouterLink>
      </div>

      <div v-else class="cluster-empty">
        <span class="add-card-icon">＋</span>
        <h2>还没有 Kafka 集群</h2>
        <p>添加第一个连接后，它会显示在这里。</p>
        <RouterLink class="add-cluster-button" to="/connect">添加集群</RouterLink>
      </div>
    </section>
  </main>
</template>
