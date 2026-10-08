<script setup lang="ts">
import { computed, ref } from "vue";
import { useData } from "vitepress";

// `frontmatter.copy` is filled in by `transformPageData` in config.mts: the
// page's own markdown, or on the overview the whole reference in one file.
const { frontmatter, page } = useData();
const copy = computed(() => frontmatter.value.copy as { markdown: string; whole: boolean } | undefined);

/** What "Copy as prompt" puts on the clipboard: the markdown, framed so a
 * coding agent treats it as the reference for whatever the reader asks next.
 * A single page tells the agent where to fetch the pages it links to; the
 * whole reference already contains them. */
function prompt(markdown: string, whole: boolean): string {
  const rule = "Call the API only from server code; never put the API key in a browser or mobile app.";
  // The fetch command ends its line, so nothing after it can be copied into
  // the URL.
  const intro = whole
    ? `Use the complete secondfactor.ai API reference below as the authoritative reference for the task I give you next. ${rule} Links such as ./errors.md#retrying point to sections within it.`
    : `Use the secondfactor.ai API documentation below ("${page.value.title}") as the authoritative reference for the task I give you next. ${rule} Links between pages are relative to ${location.origin}/. Fetch any page this one links to with curl, for example:\ncurl -s ${location.origin}/errors.md`;
  return `${intro}\n\n---\n\n${markdown}`;
}

// Which button last copied, so it can say so for a moment.
const copied = ref<"markdown" | "prompt" | null>(null);
let reset: ReturnType<typeof setTimeout> | undefined;

async function onCopy(kind: "markdown" | "prompt") {
  if (!copy.value) return;
  const { markdown, whole } = copy.value;
  await navigator.clipboard.writeText(kind === "markdown" ? markdown : prompt(markdown, whole));
  copied.value = kind;
  clearTimeout(reset);
  reset = setTimeout(() => (copied.value = null), 2000);
}
</script>

<template>
  <div v-if="copy" class="copy-buttons">
    <button
      v-for="kind in (['markdown', 'prompt'] as const)"
      :key="kind"
      type="button"
      class="copy-button"
      @click="onCopy(kind)"
    >
      <!-- Lucide's check, file-text and sparkles icons. -->
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path v-if="copied === kind" d="M20 6 9 17l-5-5" />
        <template v-else-if="kind === 'markdown'">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
        </template>
        <template v-else>
          <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0Z" />
        </template>
      </svg>
      <span v-if="copied === kind">Copied</span>
      <span v-else>{{ copy.whole ? "Copy all as" : "Copy as" }} {{ kind === "markdown" ? "Markdown" : "prompt" }}</span>
    </button>
  </div>
</template>

<style scoped>
.copy-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 8px;
}

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: color 0.2s, background-color 0.2s, border-color 0.2s;
}

.copy-button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-border);
  background: var(--vp-c-bg-soft);
}

.copy-button svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
