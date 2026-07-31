import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { ConnectionPayload, ConnectionResult } from "@/api/connections";
import { testConnection } from "@/api/connections";

const STORAGE_KEY = "kafka-tool.connection";

const defaults: ConnectionPayload = {
  name: "",
  brokers: ["localhost:9092"],
  securityProtocol: "PLAINTEXT",
  saslMechanism: "PLAIN",
  username: "",
  password: "",
  tlsSkipVerify: false,
  connectionTimeoutSeconds: 10,
};

function load(): ConnectionPayload {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaults, ...saved, password: "" };
  } catch {
    return { ...defaults };
  }
}

export const useConnectionStore = defineStore("connection", () => {
  const form = ref<ConnectionPayload>(load());
  const testing = ref(false);
  const result = ref<ConnectionResult | null>(null);
  const error = ref("");
  const usesSasl = computed(() => form.value.securityProtocol.startsWith("SASL"));
  const usesTls = computed(
    () => form.value.securityProtocol === "SSL" || form.value.securityProtocol === "SASL_SSL",
  );
  const displayName = computed(
    () => form.value.name || form.value.brokers[0] || "Kafka 集群",
  );

  function saveWithoutPassword() {
    const { password: _, ...safe } = form.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }

  async function test() {
    testing.value = true;
    result.value = null;
    error.value = "";
    try {
      result.value = await testConnection(form.value);
      saveWithoutPassword();
      return true;
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : "连接失败";
      return false;
    } finally {
      testing.value = false;
    }
  }

  return { form, testing, result, error, usesSasl, usesTls, displayName, test };
});
