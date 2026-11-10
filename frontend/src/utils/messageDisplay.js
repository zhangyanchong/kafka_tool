export const displayPageSize = 8192;
// Keep UTF-16 surrogate pairs intact at display page boundaries.
export function messageDisplayPage(value, page) {
    const boundary = (offset) => {
        const code = value.charCodeAt(offset);
        return code >= 0xdc00 && code <= 0xdfff ? offset + 1 : offset;
    };
    return value.slice(boundary(page * displayPageSize), boundary((page + 1) * displayPageSize));
}
// Display-only line breaks keep very long Base64 runs out of WebView text layout.
// The message value used by copying, exporting and Kafka stays untouched.
export function wrapMessageDisplay(value) {
    let result = "";
    let column = 0;
    for (const character of value) {
        if (character === "\n" || character === "\r") {
            result += character;
            column = 0;
        }
        else {
            if (column === 120) {
                result += "\n";
                column = 0;
            }
            result += character;
            column++;
        }
    }
    return result;
}
