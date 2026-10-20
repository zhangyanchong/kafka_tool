import test from "node:test";
import assert from "node:assert/strict";
import { testConnection, fetchTopicMessageSearchStatus, searchTopicMessages } from "./connections.js";

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


function setWindow(t, main) {
 const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
 t.after(() => {
  if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
  else delete globalThis.window;
 });
 Object.defineProperty(globalThis, "window", { configurable: true, value: { go: { main } } });
}

function nativeAPI(overrides = {}) {
 return { BeginRequest: async () => "request-1", CancelRequest: async () => {}, ...overrides };
}

test("Linux native bridge preserves POST body and error status without fetch", async (t) => {
 const payload = { brokers: ["broker:9092"] };
 t.mock.method(globalThis, "fetch", async () => { throw new Error("fetch must not run"); });
 setWindow(t, { LinuxAPIBridge: nativeAPI({
  Request: async (id, method, path, body) => {
   assert.equal(id, "request-1");
   assert.equal(method, "POST");
   assert.equal(path, "/api/v1/connections/test");
   assert.deepEqual(JSON.parse(body), payload);
   return { status: 502, body: JSON.stringify({ message: "Broker refused connection" }) };
  },
 }) });
 await assert.rejects(testConnection(payload), /Broker refused connection[\s\S]*HTTP 状态：502/);
});

test("Linux bridge preserves successful JSON and GET paths", async (t) => {
 t.mock.method(globalThis, "fetch", async () => { throw new Error("fetch must not run"); });
 setWindow(t, { LinuxAPIBridge: nativeAPI({
  Request: async (_, method, path, body) => {
   assert.equal(method, "GET");
   assert.equal(path, "/api/v1/topics/topic%2Fname/messages/search/task%2Fid");
   assert.equal(body, "");
   return { status: 200, body: '{"done":true}' };
  },
 }) });
 assert.deepEqual(await fetchTopicMessageSearchStatus("topic/name", "task/id"), { done: true });
});

test("Windows and macOS bindings keep using fetch", async (t) => {
 setWindow(t, { App: { BeginMessageExport: async () => "export" }, APIBridge: {
  Request: async () => { throw new Error("old generic bridge must not run"); },
 } });
 let called = false;
 t.mock.method(globalThis, "fetch", async (path, init) => {
  called = true;
  assert.equal(path, "/api/v1/connections/test");
  assert.equal(init.method, "POST");
  return new Response('{"success":true}');
 });
 assert.deepEqual(await testConnection({}), { success: true });
 assert.equal(called, true);
});

test("Linux abort before registration completes cancels native request before dispatch", async (t) => {
 const controller = new AbortController();
 let register;
 const registration = new Promise(resolve => { register = resolve; });
 const calls = [];
 let dispatched;
 const dispatch = new Promise(resolve => { dispatched = resolve; });
 setWindow(t, { LinuxAPIBridge: nativeAPI({
  BeginRequest: () => registration,
  CancelRequest: async id => { calls.push(["cancel", id]); },
  Request: async id => { calls.push(["request", id]); dispatched(); throw new Error("canceled"); },
 }) });
 const pending = searchTopicMessages("test", {}, {}, controller.signal);
 controller.abort();
 await assert.rejects(pending, { name: "AbortError" });
 register("slow-registration");
 await dispatch;
 assert.deepEqual(calls, [["cancel", "slow-registration"], ["request", "slow-registration"]]);
});

test("Linux abort during request notifies native backend", async (t) => {
 const controller = new AbortController();
 let dispatched;
 const dispatch = new Promise(resolve => { dispatched = resolve; });
 let cancelled;
 const cancellation = new Promise(resolve => { cancelled = resolve; });
 setWindow(t, { LinuxAPIBridge: nativeAPI({
  Request: () => { dispatched(); return new Promise(() => {}); },
  CancelRequest: async id => { assert.equal(id, "request-1"); cancelled(); },
 }) });
 const pending = searchTopicMessages("test", {}, {}, controller.signal);
 await dispatch;
 controller.abort();
 await assert.rejects(pending, { name: "AbortError" });
 await cancellation;
});

test("already aborted Linux request does not register native work", async (t) => {
 const controller = new AbortController();
 controller.abort();
 setWindow(t, { LinuxAPIBridge: nativeAPI({ BeginRequest: async () => { assert.fail("must not register"); } }) });
 await assert.rejects(searchTopicMessages("test", {}, {}, controller.signal), { name: "AbortError" });
});
