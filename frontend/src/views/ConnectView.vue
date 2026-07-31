<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { currentTheme, renderTheme } from "@/theme";

const store = useConnectionStore();
const router = useRouter();
const brokerText = ref(store.form.brokers.join("\n"));
const showPassword = ref(false);
const brokerCount = computed(
  () => brokerText.value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean).length,
);

onMounted(() => renderTheme("light"));
onBeforeUnmount(() => renderTheme(currentTheme.value));

async function submit() {
  store.form.brokers = brokerText.value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (await store.test()) {
    window.setTimeout(() => router.push("/dashboard"), 900);
  }
}
</script>

<template>
  <main class="connect-page">
    <section class="brand-panel">
      <div>
        <div class="brand">
          <span class="brand-mark"><i></i><i></i><i></i></span>
          <span>Kafka Tool</span>
        </div>
        <div class="hero-copy">
          <span class="eyebrow">DESKTOP MONITOR</span>
          <h1>看清每一条<br /><em>数据流动。</em></h1>
          <p>连接 Kafka 集群，实时观察 Topic、消费进度与积压情况。</p>
        </div>
      </div>
      <div class="signal-card">
        <div class="signal-heading"><span>实时采集</span><b>READY</b></div>
        <div class="bars">
          <i v-for="height in [25, 42, 34, 68, 54, 82, 64, 91, 72, 86, 58, 77]" :key="height" :style="{ height: `${height}%` }"></i>
        </div>
        <div class="signal-foot"><span>PRODUCE</span><span>CONSUME</span><span>LAG</span></div>
      </div>
      <small>只读监控 · 密码不会保存到本地</small>
    </section>

    <section class="form-panel">
      <div class="form-wrap">
        <header>
          <span class="step">01 / CONNECT</span>
          <h2>连接 Kafka</h2>
          <p>添加一个 Broker 即可发现整个集群，也可以填写多个地址提高连接可用性。</p>
        </header>

        <form @submit.prevent="submit">
          <label>
            <span>连接名称 <b>可选</b></span>
            <input v-model.trim="store.form.name" placeholder="例如：生产环境 Kafka" autocomplete="off" />
          </label>

          <label>
            <span>Broker 地址 <b>{{ brokerCount }} 个节点</b></span>
            <textarea
              v-model="brokerText"
              rows="3"
              required
              spellcheck="false"
              placeholder="kafka-01.example.com:9092&#10;kafka-02.example.com:9092"
            ></textarea>
            <small>每行一个地址，或使用英文逗号分隔</small>
          </label>

          <div class="grid">
            <label>
              <span>安全协议</span>
              <select v-model="store.form.securityProtocol">
                <option value="PLAINTEXT">PLAINTEXT</option>
                <option value="SSL">SSL / TLS</option>
                <option value="SASL_PLAINTEXT">SASL_PLAINTEXT</option>
                <option value="SASL_SSL">SASL_SSL</option>
              </select>
            </label>
            <label>
              <span>连接超时</span>
              <select v-model.number="store.form.connectionTimeoutSeconds">
                <option :value="5">5 秒</option>
                <option :value="10">10 秒</option>
                <option :value="20">20 秒</option>
                <option :value="30">30 秒</option>
              </select>
            </label>
          </div>

          <template v-if="store.usesSasl">
            <label>
              <span>SASL 认证机制</span>
              <select v-model="store.form.saslMechanism">
                <option value="PLAIN">PLAIN</option>
                <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                <option value="SCRAM-SHA-512">SCRAM-SHA-512</option>
              </select>
            </label>
            <div class="grid">
              <label>
                <span>用户名</span>
                <input v-model="store.form.username" required autocomplete="username" placeholder="Kafka username" />
              </label>
              <label>
                <span>密码</span>
                <div class="password">
                  <input
                    v-model="store.form.password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    placeholder="••••••••"
                  />
                  <button type="button" @click="showPassword = !showPassword">{{ showPassword ? "隐藏" : "显示" }}</button>
                </div>
              </label>
            </div>
          </template>

          <label v-if="store.usesTls" class="check">
            <input v-model="store.form.tlsSkipVerify" type="checkbox" />
            <span><strong>跳过 TLS 证书验证</strong><small>仅建议在本地或测试环境使用</small></span>
          </label>

          <div v-if="store.result" class="notice success">
            <strong>连接成功</strong>
            <span>发现 {{ store.result.brokerCount }} 个 Broker · {{ store.result.durationMs }} ms</span>
          </div>
          <div v-if="store.error" class="notice error">
            <strong>连接失败</strong>
            <span>{{ store.error }}</span>
          </div>

          <button class="submit" type="submit" :disabled="store.testing">
            <span>{{ store.testing ? "正在连接…" : "测试并连接" }}</span>
            <b>{{ store.testing ? "···" : "→" }}</b>
          </button>
        </form>
      </div>
    </section>
  </main>
</template>
