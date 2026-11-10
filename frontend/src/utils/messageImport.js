export const maxImportMessageBytes = 20 << 20;
// Read bounded chunks rather than loading an entire large file into memory.
export async function* readMessageLines(file, chunkSize = 64 * 1024) {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let pending = "";
    let lineNumber = 0;
    function record(text) {
        lineNumber++;
        const value = text.endsWith("\r") ? text.slice(0, -1) : text;
        if (new TextEncoder().encode(value).length > maxImportMessageBytes) {
            throw new Error(`第 ${lineNumber} 行超过 20 MiB，请缩小这条消息`);
        }
        return { lineNumber, value };
    }
    for (let offset = 0; offset < file.size; offset += chunkSize) {
        pending += decoder.decode(await file.slice(offset, offset + chunkSize).arrayBuffer(), { stream: true });
        let start = 0;
        let end;
        while ((end = pending.indexOf("\n", start)) !== -1) {
            yield record(pending.slice(start, end));
            start = end + 1;
        }
        pending = pending.slice(start);
        if (pending.length > maxImportMessageBytes + 1) {
            throw new Error(`第 ${lineNumber + 1} 行超过 20 MiB，请缩小这条消息`);
        }
    }
    pending += decoder.decode();
    if (pending)
        yield record(pending);
}
