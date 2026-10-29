<script setup lang="ts">
// Replaces VitePress's VPDocAsideOutline (see the alias in config.mts). The
// stock outline draws one straight border beside every heading. This one
// draws an SVG line that steps right beside nested headings and back, and
// slides the active marker along that line, bends included, instead of
// jumping between columns. It also picks the current heading itself: a heading
// becomes current once it is well into view, rather than only once it reaches
// the top of the window as in VitePress.
import { onContentUpdated, useData } from "vitepress";
import { onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import {
  getHeaders,
  resolveTitle,
} from "vitepress/dist/client/theme-default/composables/outline.js";
import VPDocOutlineItem from "vitepress/dist/client/theme-default/components/VPDocOutlineItem.vue";

// How far right the line steps for each level of nesting.
const STEP = 12;
// How far a bend reaches into the rows on either side of the gap it crosses.
// It must stay below INSET, so the marker is straight while it rests on a row.
const OVERLAP = 4;
// How far the marker stops short of the top and bottom of its row.
const INSET = 7;
// How far down the window, as a share of its height, a heading's top must
// pass for the heading to become the current one.
const THRESHOLD = 0.4;

const { frontmatter, theme } = useData();

const headers = shallowRef([]);

onContentUpdated(() => {
  headers.value = getHeaders(frontmatter.value.outline ?? theme.value.outline);
});

const content = ref<HTMLElement>();
const probe = ref<SVGPathElement>();
const line = ref<SVGPathElement>();
const drawn = ref<SVGPathElement>();

// The line and marker change on every scroll, so they are drawn by setting
// attributes directly rather than by re-rendering the component.
let total = 0;
let spans: [number, number][] = [];
// The link the reader last clicked. It stays current while the page scrolls
// to its heading, even when the next heading also ends up past the threshold
// because the clicked section is short, until the reader scrolls themselves.
let pinned: HTMLAnchorElement | null = null;

function links() {
  return [...content.value!.querySelectorAll<HTMLAnchorElement>(".outline-link")];
}

/** Returns the link of the section the reader is in. */
function current(all: HTMLAnchorElement[]) {
  if (pinned && all.includes(pinned)) return pinned;
  // The last sections may be too short for their headings ever to pass the
  // threshold, so the bottom of the page belongs to the last one.
  const page = document.documentElement;
  if (Math.abs(scrollY + innerHeight - page.scrollHeight) < 1) return all.at(-1);
  // Above the first heading, the reader is already in the first section.
  let found = all[0];
  for (const link of all) {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (heading && heading.getBoundingClientRect().top <= innerHeight * THRESHOLD) {
      found = link;
    }
  }
  return found;
}

function syncActive() {
  const all = links();
  const active = current(all);
  for (const link of all) link.classList.toggle("active", link === active);
  const span = spans[all.indexOf(active!)];
  const style = drawn.value!.style;
  style.opacity = span ? "1" : "0";
  if (!span) return;
  // The gap is longer than the whole line, so only one dash ever shows.
  style.strokeDasharray = `${span[1] - span[0]} ${total + 1}`;
  style.strokeDashoffset = `${-span[0]}`;
}

/** Returns the length of a standalone path, measured by the browser. */
function lengthOf(d: string) {
  probe.value!.setAttribute("d", d);
  return probe.value!.getTotalLength();
}

/**
 * Builds the line from where each link sits now, and records, for each link,
 * the stretch of the line the marker covers when that link is active, as
 * distances along the line. The marker is a dash of the same path, so moving
 * it is a change of dash offset, which the browser animates along the curve.
 */
function measure() {
  const el = content.value;
  if (!el) return;
  const box = el.getBoundingClientRect();
  const rows = links().map((link) => {
    const { top, bottom } = link.getBoundingClientRect();
    let depth = 0;
    for (let p = link.parentElement; p && p !== el; p = p.parentElement) {
      if (p.classList.contains("nested")) depth++;
    }
    // The half pixel puts the one-pixel line on whole device pixels.
    return { x: 0.5 + depth * STEP, top: top - box.top, bottom: bottom - box.top };
  });

  let d = rows.length ? `M ${rows[0].x} ${rows[0].top}` : "";
  // The pen's distance along the line so far, and its height. It always
  // stands on the current row's column, at or just below the row's top.
  let length = 0;
  let y = rows[0]?.top ?? 0;
  spans = rows.map((row, i): [number, number] => {
    const span: [number, number] = [
      length + row.top + INSET - y,
      length + row.bottom - INSET - y,
    ];
    const next = rows[i + 1];
    if (!next) {
      d += ` V ${row.bottom}`;
      length += row.bottom - y;
    } else if (next.x === row.x) {
      d += ` V ${next.top}`;
      length += next.top - y;
      y = next.top;
    } else {
      // An S-shaped curve across the gap between the two rows.
      const y0 = row.bottom - OVERLAP;
      const y1 = next.top + OVERLAP;
      const mid = (y0 + y1) / 2;
      const bend = `C ${row.x} ${mid} ${next.x} ${mid} ${next.x} ${y1}`;
      d += ` V ${y0} ${bend}`;
      length += y0 - y + lengthOf(`M ${row.x} ${y0} ${bend}`);
      y = y1;
    }
    return span;
  });

  total = length;
  line.value!.setAttribute("d", d);
  drawn.value!.setAttribute("d", d);
  syncActive();
}

// A new page renders new links, which may leave the outline the same size.
watch(headers, measure, { flush: "post" });

let resizes: ResizeObserver | undefined;
let frame = 0;

function onScroll() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncActive);
}

function onClick(event: MouseEvent) {
  const link = (event.target as Element).closest<HTMLAnchorElement>(".outline-link");
  if (!link) return;
  pinned = link;
  syncActive();
}

// Wheel, touch and keys are how a reader scrolls; a scroll caused by a click
// on the outline comes with none of them.
function unpin() {
  pinned = null;
}

const userScrolls = ["wheel", "touchstart", "keydown"] as const;

onMounted(() => {
  resizes = new ResizeObserver(measure);
  resizes.observe(content.value!);
  addEventListener("scroll", onScroll, { passive: true });
  for (const type of userScrolls) addEventListener(type, unpin, { passive: true });
});

onUnmounted(() => {
  resizes?.disconnect();
  cancelAnimationFrame(frame);
  removeEventListener("scroll", onScroll);
  for (const type of userScrolls) removeEventListener(type, unpin);
});
</script>

<template>
  <nav
    aria-labelledby="doc-outline-aria-label"
    class="VPDocAsideOutline"
    :class="{ 'has-outline': headers.length > 0 }"
  >
    <div class="content" ref="content" @click="onClick">
      <svg class="outline-track" aria-hidden="true">
        <path class="probe" ref="probe" />
        <path class="line" ref="line" />
        <path class="marker" ref="drawn" />
      </svg>

      <div
        aria-level="2"
        class="outline-title"
        id="doc-outline-aria-label"
        role="heading"
      >
        {{ resolveTitle(theme) }}
      </div>

      <VPDocOutlineItem :headers="headers" :root="true" />
    </div>
  </nav>
</template>

<style scoped>
.VPDocAsideOutline {
  display: none;
}

.VPDocAsideOutline.has-outline {
  display: block;
}

.content {
  position: relative;
  padding-left: 16px;
  font-size: 13px;
  font-weight: 500;
}

.outline-title {
  line-height: 32px;
  font-size: 14px;
  font-weight: 600;
}

/* Nested headings sit one step right, as their part of the line does, and
   leave room above and below them for the line's bends. */
.content :deep(.nested) {
  padding-left: 12px;
  margin-block: 8px;
}

.outline-track {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.outline-track path {
  fill: none;
}

.probe {
  stroke: none;
}

.line {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.marker {
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
  transition:
    stroke-dashoffset 0.25s cubic-bezier(0, 1, 0.5, 1),
    stroke-dasharray 0.25s cubic-bezier(0, 1, 0.5, 1),
    opacity 0.25s;
}
</style>
