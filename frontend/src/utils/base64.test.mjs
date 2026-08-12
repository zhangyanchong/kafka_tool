import assert from "node:assert/strict";
import test from "node:test";
import { decodeBase64, encodeBase64 } from "./base64.js";

test("encodes and decodes UTF-8 text", () => {
  const source = "Kafka 工具 🚀\n第二行";
  const encoded = encodeBase64(source);

  assert.equal(encoded, "S2Fma2Eg5bel5YW3IPCfmoAK56ys5LqM6KGM");
  assert.equal(decodeBase64(encoded), source);
});

test("decodes URL-safe Base64 without padding", () => {
  assert.equal(decodeBase64("8J-agA"), "🚀");
});

test("ignores whitespace in encoded content", () => {
  assert.equal(decodeBase64("5L2g 5aW9\n"), "你好");
});

test("rejects malformed Base64 and non-UTF-8 bytes", () => {
  assert.throws(() => decodeBase64("abcde"), /格式不正确/);
  assert.throws(() => decodeBase64("/w=="), /UTF-8/);
});
