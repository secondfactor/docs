import { h, onMounted } from "vue";
import { onContentUpdated } from "vitepress";
import DefaultTheme from "vitepress/theme";
// The marketing site's typefaces, self-hosted from npm.
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import CopyButtons from "./CopyButtons.vue";
import SiteFooter from "./SiteFooter.vue";
import { followLanguageClicks, restoreLanguage } from "./languageTabs";
import "./brand.css";

export default {
  extends: DefaultTheme,
  // The copy buttons sit above each page's title, as they do beside the title
  // in the dashboard's Docs tab. The footer spans the whole page below the
  // content: VitePress's own footer is hidden on pages with a sidebar, which
  // is every page here.
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "doc-before": () => h(CopyButtons),
      "layout-bottom": () => h(SiteFooter),
    }),
  setup() {
    onMounted(followLanguageClicks);
    // Every page navigation renders fresh tab groups on their first tab.
    onContentUpdated(restoreLanguage);
  },
};
