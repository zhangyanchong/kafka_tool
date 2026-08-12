import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { testConnection } from "../api/connections.js";
const LEGACY_STORAGE_KEY = "kafka-tool.connection";
const STORAGE_KEY = "kafka-tool.connections";
const ACTIVE_KEY = "kafka-tool.active-connection";
const defaults = {
    name: "",
    brokers: ["localhost:9092"],
    securityProtocol: "PLAINTEXT",
    saslMechanism: "PLAIN",
    username: "",
    password: "",
    tlsSkipVerify: false,
    connectionTimeoutSeconds: 10,
};
function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function withoutPassword(payload) {
    return { ...payload, brokers: [...payload.brokers], password: "" };
}
function loadConnections() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(saved))
            return saved;
    }
    catch {
        // Fall through to the legacy single-connection migration.
    }
    try {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!legacy)
            return [];
        const config = { ...defaults, ...JSON.parse(legacy), password: "" };
        const migrated = [{ id: createId(), config, brokerCount: 0, lastConnectedAt: "" }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
    }
    catch {
        return [];
    }
}
export const useConnectionStore = defineStore("connection", () => {
    const connections = ref(loadConnections());
    const runtimePasswords = new Map();
    const initialActiveId = localStorage.getItem(ACTIVE_KEY) || "";
    const initialConnection = connections.value.find((item) => item.id === initialActiveId);
    const activeId = ref(initialConnection?.id || "");
    const editingId = ref("");
    const form = ref(initialConnection ? withoutPassword(initialConnection.config) : { ...defaults, brokers: [...defaults.brokers] });
    const testing = ref(false);
    const result = ref(null);
    const error = ref("");
    const usesSasl = computed(() => form.value.securityProtocol.startsWith("SASL"));
    const usesTls = computed(() => form.value.securityProtocol === "SSL" || form.value.securityProtocol === "SASL_SSL");
    const displayName = computed(() => form.value.name || form.value.brokers[0] || "Kafka 集群");
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
    function activate(id) {
        const connection = connections.value.find((item) => item.id === id);
        if (!connection)
            return false;
        editingId.value = "";
        activeId.value = id;
        form.value = { ...withoutPassword(connection.config), password: runtimePasswords.get(id) || "" };
        result.value = connection.lastConnectedAt
            ? { success: true, message: "已选择保存的集群", brokerCount: connection.brokerCount }
            : null;
        error.value = "";
        localStorage.setItem(ACTIVE_KEY, id);
        return true;
    }
    function beginEdit(id) {
        const connection = connections.value.find((item) => item.id === id);
        if (!connection)
            return false;
        editingId.value = id;
        form.value = { ...withoutPassword(connection.config), password: runtimePasswords.get(id) || "" };
        result.value = null;
        error.value = "";
        return true;
    }
    function deleteConnection(id) {
        const index = connections.value.findIndex((item) => item.id === id);
        if (index === -1)
            return false;
        connections.value.splice(index, 1);
        runtimePasswords.delete(id);
        if (editingId.value === id)
            editingId.value = "";
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
        const saved = {
            id,
            config: withoutPassword(form.value),
            brokerCount: result.value?.brokerCount || 0,
            lastConnectedAt: new Date().toISOString(),
        };
        if (form.value.password)
            runtimePasswords.set(id, form.value.password);
        const index = connections.value.findIndex((item) => item.id === id);
        if (index === -1)
            connections.value.push(saved);
        else
            connections.value[index] = saved;
        activeId.value = id;
        editingId.value = "";
        localStorage.setItem(ACTIVE_KEY, id);
        persistConnections();
    }
    async function test() {
        testing.value = true;
        result.value = null;
        error.value = "";
        try {
            result.value = await testConnection(form.value);
            saveCurrentConnection();
            return true;
        }
        catch (reason) {
            error.value = reason instanceof Error ? reason.message : "连接失败";
            return false;
        }
        finally {
            testing.value = false;
        }
    }
    return {
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
