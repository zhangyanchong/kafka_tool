import assert from "node:assert/strict";
import test from "node:test";
import { displayPageSize, messageDisplayPage, wrapMessageDisplay } from "./messageDisplay.js";

test("all display pages reconstruct the original, including emoji at boundaries", () => {
  const value = 'x'.repeat(displayPageSize - 1) + '🚀你好' + 'y'.repeat(displayPageSize * 2);
  const pages = Array.from({ length: Math.ceil(value.length / displayPageSize) }, (_, page) => messageDisplayPage(value, page));
  assert.equal(pages.join(''), value);
  for (const part of pages) assert.ok(!/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(part));
});

test("limits Base64 display line lengths without losing characters", () => {
  const value = 'Abc123+/='.repeat(2000);
  const result = wrapMessageDisplay(value);
  assert.equal(result.replaceAll('\n', ''), value);
  assert.ok(result.split('\n').every(line => line.length <= 120));
});

test("preserves existing line endings and empty content", () => {
  assert.equal(wrapMessageDisplay('a\r\nb\nc'), 'a\r\nb\nc');
  assert.equal(wrapMessageDisplay(''), '');
  assert.equal(messageDisplayPage('', 0), '');
});
