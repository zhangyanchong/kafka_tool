const BYTE_CHUNK_SIZE = 0x8000;
export function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += BYTE_CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + BYTE_CHUNK_SIZE));
    }
    return btoa(binary);
}
export function decodeBase64(value) {
    const normalized = value
        .replace(/\s/g, "")
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    if (!normalized)
        return "";
    if (normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
        throw new Error("Base64 内容格式不正确");
    }
    const withoutPadding = normalized.replace(/=+$/, "");
    if (withoutPadding.includes("=")) {
        throw new Error("Base64 填充位置不正确");
    }
    const padded = withoutPadding.padEnd(Math.ceil(withoutPadding.length / 4) * 4, "=");
    let binary;
    try {
        binary = atob(padded);
    }
    catch {
        throw new Error("Base64 内容格式不正确");
    }
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    catch {
        throw new Error("解码结果不是有效的 UTF-8 文本");
    }
}
