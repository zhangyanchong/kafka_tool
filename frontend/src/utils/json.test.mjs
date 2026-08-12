import assert from "node:assert/strict";
import test from "node:test";
import { expandEmbeddedJson } from "./json.js";

test("expands JSON object and array strings recursively", () => {
  const source = {
    params: "{\n  \"task_id\": \"202608061811_zyc_001\",\n  \"topics\": [\"log\", \"sample\"]\n}\n",
    resp: "{\"code\":\"200\",\"data\":null}",
    nested: ["[{\"enabled\":true}]"],
  };

  const result = expandEmbeddedJson(source);

  assert.equal(result.expandedCount, 3);
  assert.deepEqual(result.value, {
    params: {
      task_id: "202608061811_zyc_001",
      topics: ["log", "sample"],
    },
    resp: { code: "200", data: null },
    nested: [[{ enabled: true }]],
  });
});

test("keeps primitive, invalid, and ordinary strings unchanged", () => {
  const source = {
    code: "200",
    enabled: "true",
    empty: "null",
    ip: "119.168.81.140",
    invalidContainer: "{not json}",
  };

  const result = expandEmbeddedJson(source);

  assert.equal(result.expandedCount, 0);
  assert.deepEqual(result.value, source);
});

test("preserves keys named __proto__", () => {
  const source = JSON.parse('{"__proto__":"{\\"safe\\":true}"}');
  const result = expandEmbeddedJson(source);

  assert.equal(result.expandedCount, 1);
  assert.equal(Object.hasOwn(result.value, "__proto__"), true);
  assert.deepEqual(result.value.__proto__, { safe: true });
});
