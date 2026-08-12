<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { currentTheme, renderTheme } from "@/theme";
import { decodeBase64, encodeBase64 } from "@/utils/base64";
import { expandEmbeddedJson, type JsonValue } from "@/utils/json";

type ToolName = "json" | "base64";

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
});

const activeTool = ref<ToolName>("json");
const input = ref("");
const output = ref("");
const error = ref("");
const copied = ref(false);
const base64Input = ref("");
const base64Output = ref("");
const base64Error = ref("");
const base64Copied = ref(false);
const inputLength = computed(() => input.value.length);
const outputLength = computed(() => output.value.length);
const base64InputLength = computed(() => base64Input.value.length);
const base64OutputLength = computed(() => base64Output.value.length);

onMounted(() => {
  if (!props.embedded) renderTheme("light");
});
onBeforeUnmount(() => {
  if (!props.embedded) renderTheme(currentTheme.value);
});

function parseJson(): JsonValue {
  if (!input.value.trim()) throw new Error("请先输入 JSON 内容");
  return JSON.parse(input.value) as JsonValue;
}

function formatJson() {
  try {
    output.value = JSON.stringify(parseJson(), null, 2);
    error.value = "";
  } catch (reason) {
    error.value = reason instanceof Error ? `JSON 格式错误：${reason.message}` : "JSON 格式错误";
  }
}

function minifyJson() {
  try {
    output.value = JSON.stringify(parseJson());
    error.value = "";
  } catch (reason) {
    error.value = reason instanceof Error ? `JSON 格式错误：${reason.message}` : "JSON 格式错误";
  }
}

function formatEmbeddedJson() {
  try {
    const expanded = expandEmbeddedJson(parseJson());
    output.value = JSON.stringify(expanded.value, null, 2);
    error.value = "";
  } catch (reason) {
    error.value = reason instanceof Error ? `JSON 格式错误：${reason.message}` : "JSON 格式错误";
  }
}

function removeEscapeSlashes() {
  let value = input.value.trim();
  if (!value) {
    error.value = "请先输入 JSON 内容";
    return;
  }

  try {
    for (let index = 0; index < 3; index += 1) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "string") {
          value = parsed.trim();
          try {
            JSON.parse(value);
            continue;
          } catch {
            output.value = parsed;
            error.value = "";
            return;
          }
        }
        output.value = JSON.stringify(parsed, null, 2);
        error.value = "";
        return;
      } catch {
        const unescaped = value.replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
        if (unescaped === value) throw new Error("无法识别需要去除的转义斜杠");
        value = unescaped;
      }
    }
    output.value = value;
    error.value = "";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "处理失败";
  }
}

function clearAll() {
  input.value = "";
  output.value = "";
  error.value = "";
  copied.value = false;
}

async function copyOutput() {
  if (!output.value) return;
  try {
    await navigator.clipboard.writeText(output.value);
    copied.value = true;
    error.value = "";
    window.setTimeout(() => (copied.value = false), 1200);
  } catch {
    error.value = "复制失败，请手动选择结果内容复制";
  }
}

function encodeBase64Text() {
  if (!base64Input.value) {
    base64Error.value = "请先输入需要编码的文本";
    return;
  }

  base64Output.value = encodeBase64(base64Input.value);
  base64Error.value = "";
}

function decodeBase64Text() {
  if (!base64Input.value.trim()) {
    base64Error.value = "请先输入需要解码的 Base64 内容";
    return;
  }

  try {
    base64Output.value = decodeBase64(base64Input.value);
    base64Error.value = "";
  } catch (reason) {
    base64Error.value = reason instanceof Error ? reason.message : "Base64 解码失败";
  }
}

function clearBase64() {
  base64Input.value = "";
  base64Output.value = "";
  base64Error.value = "";
  base64Copied.value = false;
}

async function copyBase64Output() {
  if (!base64Output.value) return;
  try {
    await navigator.clipboard.writeText(base64Output.value);
    base64Copied.value = true;
    base64Error.value = "";
    window.setTimeout(() => (base64Copied.value = false), 1200);
  } catch {
    base64Error.value = "复制失败，请手动选择结果内容复制";
  }
}
</script>

<template>
  <main :class="['tools-page', { embedded }]">
    <aside v-if="!embedded" class="tools-sidebar">
      <div class="sidebar-brand">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>常用工具</span>
      </div>
      <nav class="tools-nav" aria-label="工具菜单">
        <button :class="{ active: activeTool === 'json' }" type="button" @click="activeTool = 'json'">
          <span>{ }</span>
          JSON 格式化
        </button>
        <button :class="{ active: activeTool === 'base64' }" type="button" @click="activeTool = 'base64'">
          <span>B64</span>
          Base64 编解码
        </button>
      </nav>
      <RouterLink class="tools-home-link" to="/">← 返回集群首页</RouterLink>
    </aside>

    <section class="tools-workspace">
      <header v-if="!embedded" class="tools-topbar">
        <div>
          <span>{{ activeTool === "json" ? "JSON TOOL" : "BASE64 TOOL" }}</span>
          <strong>{{ activeTool === "json" ? "JSON 格式化" : "Base64 编解码" }}</strong>
        </div>
        <small>所有内容仅在本地处理</small>
      </header>

      <nav v-else class="embedded-tools-nav" aria-label="常用工具类型">
        <button :class="{ active: activeTool === 'json' }" type="button" @click="activeTool = 'json'">
          <span>{ }</span>JSON 格式化
        </button>
        <button :class="{ active: activeTool === 'base64' }" type="button" @click="activeTool = 'base64'">
          <span>B64</span>Base64 编解码
        </button>
        <small>所有内容仅在本地处理</small>
      </nav>

      <div v-if="activeTool === 'json'" class="tools-content">
        <div class="tools-heading">
          <h1>格式化 JSON</h1>
          <p>美化、压缩 JSON，或展开日志字段中被保存为字符串的内嵌 JSON。</p>
        </div>

        <div class="json-actions">
          <button class="primary" type="button" @click="formatJson">美化 JSON</button>
          <button type="button" @click="formatEmbeddedJson">展开内嵌 JSON</button>
          <button type="button" @click="minifyJson">压缩 JSON</button>
          <button type="button" @click="removeEscapeSlashes">去除转义斜杠</button>
          <button class="quiet" type="button" @click="clearAll">清空</button>
        </div>

        <div v-if="error" class="notice error tools-error">
          <strong>处理失败</strong>
          <span>{{ error }}</span>
        </div>

        <div class="json-editor-grid">
          <section class="json-editor">
            <header><strong>输入</strong><span>{{ inputLength }} 字符</span></header>
            <textarea
              v-model="input"
              spellcheck="false"
              placeholder='粘贴 JSON，例如：{\"name\": \"Kafka Tool\"}'
            ></textarea>
          </section>
          <section class="json-editor">
            <header>
              <strong>结果</strong>
              <div><span>{{ outputLength }} 字符</span><button type="button" :disabled="!output" @click="copyOutput">{{ copied ? "已复制" : "复制" }}</button></div>
            </header>
            <textarea v-model="output" readonly spellcheck="false" placeholder="处理结果会显示在这里"></textarea>
          </section>
        </div>
      </div>

      <div v-else class="tools-content">
        <div class="tools-heading">
          <h1>Base64 编解码</h1>
          <p>将 UTF-8 文本编码为 Base64，或将标准及 URL-safe Base64 解码为文本。Base64 不是安全加密。</p>
        </div>

        <div class="json-actions">
          <button class="primary" type="button" @click="encodeBase64Text">Base64 编码</button>
          <button type="button" @click="decodeBase64Text">Base64 解码</button>
          <button class="quiet" type="button" @click="clearBase64">清空</button>
        </div>

        <div v-if="base64Error" class="notice error tools-error">
          <strong>处理失败</strong>
          <span>{{ base64Error }}</span>
        </div>

        <div class="json-editor-grid">
          <section class="json-editor">
            <header><strong>输入</strong><span>{{ base64InputLength }} 字符</span></header>
            <textarea
              v-model="base64Input"
              spellcheck="false"
              placeholder="输入原始文本进行编码，或粘贴 Base64 内容进行解码"
            ></textarea>
          </section>
          <section class="json-editor">
            <header>
              <strong>结果</strong>
              <div><span>{{ base64OutputLength }} 字符</span><button type="button" :disabled="!base64Output" @click="copyBase64Output">{{ base64Copied ? "已复制" : "复制" }}</button></div>
            </header>
            <textarea v-model="base64Output" readonly spellcheck="false" placeholder="处理结果会显示在这里"></textarea>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>
