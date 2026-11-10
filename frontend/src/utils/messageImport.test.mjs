import assert from "node:assert/strict";
import test from "node:test";
import { readMessageLines, maxImportMessageBytes } from "./messageImport.js";

async function collect(file, chunkSize) {
  const result = [];
  for await (const line of readMessageLines(file, chunkSize)) result.push(line);
  return result;
}

test("preserves message content across UTF-8 and Windows newline chunk boundaries", async () => {
  const lines = await collect(new Blob(['\uFEFF{"text":"你好🚀"}\r\n\r\n  keep spaces  \nlast']), 1);
  assert.deepEqual(lines, [
    { lineNumber: 1, value: '{"text":"你好🚀"}' },
    { lineNumber: 2, value: '' },
    { lineNumber: 3, value: '  keep spaces  ' },
    { lineNumber: 4, value: 'last' },
  ]);
});

test("handles empty files and trailing newline without extra records", async () => {
  assert.deepEqual(await collect(new Blob([])), []);
  assert.deepEqual(await collect(new Blob(['one\n'])), [{ lineNumber: 1, value: 'one' }]);
});

test("accepts a 20 MiB line and rejects an oversized line", async () => {
  const value = 'x'.repeat(maxImportMessageBytes);
  const lines = await collect(new Blob([value]), 1024 * 1024);
  assert.equal(lines[0].value.length, maxImportMessageBytes);
  await assert.rejects(collect(new Blob([value, 'x\n']), 1024 * 1024), /第 1 行超过 20 MiB/);
});

test("rejects invalid UTF-8 rather than corrupting message content", async () => {
  await assert.rejects(collect(new Blob([new Uint8Array([0xff])])), TypeError);
});
