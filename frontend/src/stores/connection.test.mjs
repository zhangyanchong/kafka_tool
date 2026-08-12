import assert from "node:assert/strict";
import test from "node:test";
import { createPinia, setActivePinia } from "pinia";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

const savedConnections = [
  {
    id: "cluster-a",
    config: {
      name: "集群 A",
      brokers: ["a.example.com:9092"],
      securityProtocol: "PLAINTEXT",
      saslMechanism: "PLAIN",
      username: "",
      password: "",
      tlsSkipVerify: false,
      connectionTimeoutSeconds: 10,
    },
    brokerCount: 3,
    lastConnectedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "cluster-b",
    config: {
      name: "集群 B",
      brokers: ["b.example.com:9092"],
      securityProtocol: "PLAINTEXT",
      saslMechanism: "PLAIN",
      username: "",
      password: "",
      tlsSkipVerify: false,
      connectionTimeoutSeconds: 10,
    },
    brokerCount: 2,
    lastConnectedAt: "2026-08-02T00:00:00.000Z",
  },
];

const storage = new MemoryStorage();
storage.setItem("kafka-tool.connections", JSON.stringify(savedConnections));
storage.setItem("kafka-tool.active-connection", "cluster-a");
globalThis.localStorage = storage;
globalThis.fetch = async () => new Response(JSON.stringify({
  success: true,
  message: "ok",
  brokerCount: 4,
  durationMs: 8,
}), { status: 200, headers: { "Content-Type": "application/json" } });

const { useConnectionStore } = await import("./connection.js");

test("editing overwrites the saved connection without creating a duplicate", async () => {
  setActivePinia(createPinia());
  const store = useConnectionStore();

  assert.equal(store.beginEdit("cluster-b"), true);
  assert.equal(store.activeId, "cluster-a");
  store.form.name = "集群 B（修改）";
  assert.equal(await store.test(), true);

  assert.equal(store.connections.length, 2);
  assert.equal(store.connections.find((item) => item.id === "cluster-b")?.config.name, "集群 B（修改）");
  assert.equal(store.activeId, "cluster-b");
});

test("deleting another connection preserves the active one, then deleting active clears it", () => {
  storage.setItem("kafka-tool.connections", JSON.stringify(savedConnections));
  storage.setItem("kafka-tool.active-connection", "cluster-a");
  setActivePinia(createPinia());
  const store = useConnectionStore();

  assert.equal(store.deleteConnection("cluster-b"), true);
  assert.equal(store.activeId, "cluster-a");
  assert.equal(store.form.name, "集群 A");

  assert.equal(store.deleteConnection("cluster-a"), true);
  assert.equal(store.activeId, "");
  assert.equal(storage.getItem("kafka-tool.active-connection"), null);
  assert.equal(store.connections.length, 0);
});
