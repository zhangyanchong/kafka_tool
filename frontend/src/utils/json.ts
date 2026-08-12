export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ExpandedJson {
  value: JsonValue;
  expandedCount: number;
}

const MAX_EMBEDDED_JSON_DEPTH = 20;

function looksLikeJsonContainer(value: string) {
  return (
    (value.startsWith("{") && value.endsWith("}")) ||
    (value.startsWith("[") && value.endsWith("]"))
  );
}

/**
 * Recursively turns JSON object/array strings into their structured values.
 * Primitive-looking strings such as "123", "true" and "null" stay strings,
 * so identifiers and ordinary log fields are not silently retyped.
 */
export function expandEmbeddedJson(
  value: JsonValue,
  depth = 0,
): ExpandedJson {
  if (depth >= MAX_EMBEDDED_JSON_DEPTH) {
    return { value, expandedCount: 0 };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!looksLikeJsonContainer(trimmed)) {
      return { value, expandedCount: 0 };
    }

    try {
      const parsed = JSON.parse(trimmed) as JsonValue;
      const expanded = expandEmbeddedJson(parsed, depth + 1);
      return {
        value: expanded.value,
        expandedCount: expanded.expandedCount + 1,
      };
    } catch {
      return { value, expandedCount: 0 };
    }
  }

  if (Array.isArray(value)) {
    let expandedCount = 0;
    const expandedValue = value.map((item) => {
      const expanded = expandEmbeddedJson(item, depth + 1);
      expandedCount += expanded.expandedCount;
      return expanded.value;
    });
    return { value: expandedValue, expandedCount };
  }

  if (value !== null && typeof value === "object") {
    let expandedCount = 0;
    const entries = Object.entries(value).map(([key, item]) => {
      const expanded = expandEmbeddedJson(item, depth + 1);
      expandedCount += expanded.expandedCount;
      return [key, expanded.value] as const;
    });
    const expandedValue = Object.fromEntries(entries) as { [key: string]: JsonValue };
    return { value: expandedValue, expandedCount };
  }

  return { value, expandedCount: 0 };
}
