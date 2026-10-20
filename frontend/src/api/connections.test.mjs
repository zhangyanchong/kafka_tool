import test from "node:test";
import assert from "node:assert/strict";
import { testConnection } from "./connections.js";

test("transport failure identifies backend communication and preserves original error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Load failed"); });
  await assert.rejects(testConnection({}), (error) => {
    assert.match(error.message, /暂时无法确认 Kafka 连接结果/);
    assert.match(error.message, /原始错误：Load failed/);
    assert.match(error.message, /\/api\/v1\/connections\/test/);
    return true;
  });
});

test("Kafka error response keeps its actual message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ message: "连接失败：Broker 拒绝连接" }), { status: 502 },
  ));
  await assert.rejects(testConnection({}), (error) => {
    assert.match(error.message, /连接失败：Broker 拒绝连接/);
    assert.match(error.message, /HTTP 状态：502/);
    assert.match(error.message, /后端响应/);
    return true;
  });
});


test("desktop bridge preserves POST body and backend error status without fetch", async (t) => {
  const payload = { brokers: ["broker:9092"] };
  t.mock.method(globalThis, "fetch", async () => { throw new Error("fetch must not run"); });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { go: { main: { APIBridge: {
    Request: async (method, path, body) => {
      assert.equal(method, "POST");
      assert.equal(path, "/api/v1/connections/test");
      assert.deepEqual(JSON.parse(body), payload);
      return { status: 502, body: JSON.stringify({ message: "Broker refused connection" }) };
    },
  } } } } });
  await assert.rejects(testConnection(payload), /Broker refused connection[\s\S]*HTTP 状态：502/);
});
