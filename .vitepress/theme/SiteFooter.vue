<script setup lang="ts">
import { useData, withBase } from "vitepress";

// Modelled on the footer of secondfactor.ai, so the docs read as part of the
// same site. The links live in `themeConfig.footer` in config.mts.
const { theme } = useData();
const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="columns">
        <div class="about">
          <a :href="theme.footer.columns[0][0].link" class="brand">
            <img :src="withBase('/logo-full.png')" alt="SecondFactor" class="light-only" />
            <img :src="withBase('/logo-full-white.png')" alt="SecondFactor" class="dark-only" />
          </a>
          <p>One stop solution for your OTPs. Send and verify through the lowest-cost eligible channel.</p>
        </div>
        <ul v-for="(column, i) in theme.footer.columns" :key="i">
          <li v-for="item in column" :key="item.text">
            <a :href="item.link">{{ item.text }}</a>
          </li>
          <li v-if="i === theme.footer.columns.length - 1">
            <a :href="theme.footer.linkedin" target="_blank" rel="noreferrer" aria-label="SecondFactor on LinkedIn">
              <!-- Simple Icons' LinkedIn mark. -->
              <svg viewBox="0 0 24 24" class="linkedin" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div class="bottom">
      <div class="container bar">
        <span>© {{ year }} SecondFactor.ai. All rights reserved.</span>
        <a :href="theme.footer.llms">llms.txt for coding agents</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* Full width, under the content and the sidebar alike. On a desktop the
   sidebar is fixed to the left edge, so the footer sits one layer above it to
   cover the sidebar's lower part rather than run underneath it; the phone
   drawer and the top nav stay above the footer. */
.site-footer {
  position: relative;
  z-index: calc(var(--vp-z-index-sidebar) + 1);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 14px;
  line-height: 20px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
}

@media (max-width: 959px) {
  .site-footer {
    z-index: auto;
  }
}

.container {
  margin: 0 auto;
  max-width: var(--vp-layout-max-width);
  padding: 0 24px;
}

@media (min-width: 768px) {
  .container {
    padding: 0 64px;
  }
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 48px 0;
}

@media (min-width: 960px) {
  .columns {
    grid-template-columns: repeat(4, 1fr);
  }
}

.about {
  grid-column: 1 / -1;
}

@media (min-width: 960px) {
  .about {
    grid-column: auto;
  }
}

.brand img {
  height: 30px;
  width: auto;
}

.dark .light-only,
:root:not(.dark) .dark-only {
  display: none;
}

.about p {
  margin-top: 16px;
  max-width: 300px;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

a {
  color: var(--vp-c-text-2);
  transition: color 0.2s;
}

a:hover {
  color: var(--vp-c-text-1);
}

.linkedin {
  display: block;
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.bottom {
  border-top: 1px solid var(--vp-c-divider);
  font-size: 13px;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 24px;
  padding-top: 20px;
  padding-bottom: 20px;
}
</style>
