import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { ConnectionPayload, ConnectionResult } from "../api/connections.js";
import { testConnection } from "../api/connections.js";

const LEGACY_STORAGE_KEY = "kafka-tool.connection";
const STORAGE_KEY = "kafka-tool.connections";
const ACTIVE_KEY = "kafka-tool.active-connection";

export interface SavedConnection {
  id: string;
  config: ConnectionPayload;
  brokerCount: number;
  lastConnectedAt: string;
}

const defaults: ConnectionPayload = {
  name: "",
  brokers: ["localhost:9092"],
  securityProtocol: "PLAINTEXT",
  saslMechanism: "PLAIN",
  username: "",
  password: "",
  tlsSkipVerify: false,
	connectionTimeoutSeconds: 60,
  sshEnabled: false,
  sshAddress: "",
  sshUsername: "",
  sshPassword: "",
};

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function withoutKafkaPassword(payload: ConnectionPayload): ConnectionPayload {
  return { ...payload, brokers: [...payload.brokers], password: "" };
}

function loadConnections(): SavedConnection[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) {
      return saved.map((item) => ({
        ...item,
        config: withoutKafkaPassword({ ...defaults, ...item.config }),
      }));
    }
  } catch {
    // Fall through to the legacy single-connection migration.
  }

  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return [];
    const config = withoutKafkaPassword({ ...defaults, ...JSON.parse(legacy) });
    const migrated = [{ id: createId(), config, brokerCount: 0, lastConnectedAt: "" }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

export const useConnectionStore = defineStore("connection", () => {
  const connections = ref<SavedConnection[]>(loadConnections());
  const runtimeSecrets = new Map<string, { password: string }>();
  const initialActiveId = localStorage.getItem(ACTIVE_KEY) || "";
  const initialConnection = connections.value.find((item) => item.id === initialActiveId);
  const activeId = ref(initialConnection?.id || "");
  const editingId = ref("");
  const form = ref<ConnectionPayload>(
    initialConnection ? withoutKafkaPassword(initialConnection.config) : { ...defaults, brokers: [...defaults.brokers] },
  );
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

  function persistConnections() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections.value));
  }

  function beginAdd() {
    editingId.value = "";
    activeId.value = "";
    form.value = { ...defaults, brokers: [...defaults.brokers] };
    result.value = null;
    error.value = "";
  }

  function activate(id: string) {
    const connection = connections.value.find((item) => item.id === id);
    if (!connection) return false;
    editingId.value = "";
    activeId.value = id;
    const secrets = runtimeSecrets.get(id);
    form.value = {
      ...withoutKafkaPassword(connection.config),
      password: secrets?.password || "",
    };
    result.value = connection.lastConnectedAt
      ? { success: true, message: "已选择保存的集群", brokerCount: connection.brokerCount }
      : null;
    error.value = "";
    localStorage.setItem(ACTIVE_KEY, id);
    return true;
  }

  function beginEdit(id: string) {
    const connection = connections.value.find((item) => item.id === id);
    if (!connection) return false;
    editingId.value = id;
    const secrets = runtimeSecrets.get(id);
    form.value = {
      ...withoutKafkaPassword(connection.config),
      password: secrets?.password || "",
    };
    result.value = null;
    error.value = "";
    return true;
  }

  function deleteConnection(id: string) {
    const index = connections.value.findIndex((item) => item.id === id);
    if (index === -1) return false;

    connections.value.splice(index, 1);
    runtimeSecrets.delete(id);
    if (editingId.value === id) editingId.value = "";
    if (activeId.value === id) {
      activeId.value = "";
      form.value = { ...defaults, brokers: [...defaults.brokers] };
      result.value = null;
      error.value = "";
      localStorage.removeItem(ACTIVE_KEY);
    }
    persistConnections();
    return true;
  }

  function saveCurrentConnection() {
    const id = editingId.value || activeId.value || createId();
    const saved: SavedConnection = {
      id,
      config: withoutKafkaPassword(form.value),
      brokerCount: result.value?.brokerCount || 0,
      lastConnectedAt: new Date().toISOString(),
    };
    if (form.value.password) {
      runtimeSecrets.set(id, { password: form.value.password });
    } else {
      runtimeSecrets.delete(id);
    }
    const index = connections.value.findIndex((item) => item.id === id);
    if (index === -1) connections.value.push(saved);
    else connections.value[index] = saved;
    activeId.value = id;
    editingId.value = "";
    localStorage.setItem(ACTIVE_KEY, id);
    persistConnections();
  }

  const diagnostics = ref("");

  async function test() {
    const started = Date.now();
    const snapshot = { ...form.value, brokers: [...form.value.brokers] };
    diagnostics.value = "";
    testing.value = true;
    result.value = null;
    error.value = "";
    try {
      result.value = await testConnection(form.value);
      saveCurrentConnection();
      return true;
    } catch (reason) {
      let detail = reason instanceof Error ? reason.message : String(reason);
      for (const secret of [snapshot.password, snapshot.sshPassword]) {
        if (secret) detail = detail.split(secret).join("[已隐藏]");
      }
      error.value = detail;
      diagnostics.value = [
        `时间：${new Date(started).toISOString()}`,
        `耗时：${Date.now() - started} ms；配置超时：${snapshot.connectionTimeoutSeconds} 秒`,
        `Broker：${snapshot.brokers.join(", ")}`,
        `安全协议：${snapshot.securityProtocol}；SASL：${snapshot.securityProtocol.startsWith("SASL") ? snapshot.saslMechanism : "未启用"}`,
        `TLS 跳过证书校验：${snapshot.tlsSkipVerify ? "是" : "否"}`,
        `SSH：${snapshot.sshEnabled ? snapshot.sshAddress : "未启用"}`,
        "接口：POST /api/v1/connections/test",
        "", "错误详情：", detail,
        "", "排查建议（需结合原始错误判断）：",
        "• Load failed / Failed to fetch：界面未获取到后端响应，不能据此断定 Kafka 不通。",
        "• connection refused：检查端口、Kafka 服务监听和防火墙。",
        "• timeout / deadline exceeded：检查网络、路由、防火墙及连接超时。",
        "• no such host：检查 Broker 域名及现场 DNS。",
        "• TLS / x509：检查安全协议、证书信任、证书域名及系统时间。",
        "• SASL / authentication：检查认证机制、账号、密码与权限。",
        "• 已连接但读取集群失败：检查 advertised.listeners 返回的各 Broker 地址是否从当前机器可达。",
        "", "麒麟日志：通过 bash launch.sh 启动，重试后查看终端；",
        "日志默认位于 ~/.local/state/kafka-tool/（设置 XDG_STATE_HOME 时以该目录为准）。",
        "查找 connection_test started / failed / succeeded；没有 started 需排查请求是否到达后端。",
      ].join("\n");
      return false;
    } finally {
      testing.value = false;
    }
  }

  return {
    diagnostics,
    connections,
    activeId,
    form,
    testing,
    result,
    error,
    usesSasl,
    usesTls,
    displayName,
    beginAdd,
    beginEdit,
    activate,
    deleteConnection,
    test,
  };
});
