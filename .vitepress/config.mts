import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitepress";

// The client app and the API the site links to. The public docs describe the
// production API (every example calls api.secondfactor.ai), so the links
// default to production too. The variable names are the ones the dashboard's
// own frontend build uses, for a build that should point elsewhere.
const appUrl = (process.env.VITE_WEB_URL ?? "https://app.secondfactor.ai").replace(/\/$/, "");
const apiUrl = (process.env.VITE_API_URL ?? "https://api.secondfactor.ai").replace(/\/$/, "");
// The marketing site, which has a single production origin.
const siteUrl = "https://secondfactor.ai";

// The pages. They are a copy of `api_docs/` in the secondfactor.ai repository,
// which the dashboard's Docs tab renders, so a change to one belongs in the
// other too (see README.md).
const contentDir = path.resolve(__dirname, "../content");

/** Reads one flat `key: value` from a page's frontmatter. */
function field(source: string, key: string): string | undefined {
  return new RegExp(`^${key}:\\s*(.+)$`, "m").exec(source)?.[1].trim();
}

// Every page in the order its `order` frontmatter asks for, as the Docs tab
// lists them. `markdown` is the file without its frontmatter, which is what the
// copy buttons hand to a reader.
const pages = fs
  .readdirSync(contentDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const source = fs.readFileSync(path.join(contentDir, file), "utf8");
    return {
      file,
      text: field(source, "title") ?? file,
      link: file === "README.md" ? "/" : `/${file.replace(/\.md$/, "")}`,
      order: Number(field(source, "order") ?? Infinity),
      markdown: source.replace(/^---\n[\s\S]*?\n---\n+/, ""),
    };
  })
  .sort((a, b) => a.order - b.order);

// The tab label for each language a request example is written in. A run of
// two or more adjacent code blocks in these languages is one request shown
// several ways, and renders as one block with a tab per language.
const exampleLanguages: Record<string, string> = {
  bash: "cURL",
  python: "Python",
  js: "Node.js",
  java: "Java",
  rust: "Rust",
  go: "Go",
};

// The overview's copy buttons hand over the whole reference in one file, so an
// agent given it needs nothing else.
const fullReference = pages.map((page) => page.markdown.trim()).join("\n\n---\n\n");

export default defineConfig({
  title: "SecondFactor Docs",
  titleTemplate: ":title · SecondFactor Docs",
  description: "Send a one-time passcode and verify the code your user types back.",
  srcDir: contentDir,
  // README.md is the overview, served at the site root.
  rewrites: { "README.md": "index.md" },
  cleanUrls: true,
  markdown: {
    config: (md) => {
      // The pages stay plain markdown, which GitHub and the dashboard's Docs
      // tab render as consecutive blocks. Here each run of request
      // examples is wrapped in the tokens VitePress's own `::: code-group`
      // container produces, with the tab label as the block's `[title]`, so
      // its renderer draws the tabs.
      md.core.ruler.after("block", "request-tabs", (state) => {
        const tokens = state.tokens;
        const isExample = (i: number) =>
          tokens[i]?.type === "fence" && Object.hasOwn(exampleLanguages, tokens[i].info.trim());
        for (let start = 0; start < tokens.length; start++) {
          let end = start;
          while (isExample(end)) end++;
          if (end - start < 2) continue;
          for (let i = start; i < end; i++) {
            const lang = tokens[i].info.trim();
            tokens[i].info = `${lang} [${exampleLanguages[lang]}]`;
          }
          const open = new state.Token("container_code-group_open", "div", 1);
          const close = new state.Token("container_code-group_close", "div", -1);
          open.block = close.block = true;
          tokens.splice(end, 0, close);
          tokens.splice(start, 0, open);
          start = end + 1;
        }
      });
      // `rewrites` moves the page but not the links to it: point `./README.md`
      // links at the root before VitePress resolves them.
      md.core.ruler.push("readme-links", (state) => {
        for (const token of state.tokens) {
          for (const child of token.children ?? []) {
            const href = child.type === "link_open" && child.attrGet("href");
            if (href) child.attrSet("href", href.replace(/^\.\/README\.md/, "./index.md"));
          }
        }
      });
    },
  },
  // Hands each page its own markdown for the copy buttons (see
  // theme/CopyButtons.vue), and the overview the whole reference.
  transformPageData(pageData) {
    const page = pages.find((p) => p.file === pageData.filePath);
    if (!page) return;
    const whole = page.file === "README.md";
    pageData.frontmatter.copy = { markdown: whole ? fullReference : page.markdown, whole };
  },
  // Publishes the source files beside the pages, so `/send-otp.md` serves the
  // raw markdown. The pages link to each other as `./send-otp.md`, so an agent
  // reading one of these files can fetch the pages it links to as written.
  buildEnd({ outDir }) {
    for (const { file } of pages) fs.copyFileSync(path.join(contentDir, file), path.join(outDir, file));
  },
  head: [["link", { rel: "icon", href: "/favicon.png" }]],
  themeConfig: {
    // The dark mark is the white tile cut from the landing page's
    // logo-white.png, the only light-on-dark version of the mark we have.
    logo: { light: "/logo.png", dark: "/logo-dark.png" },
    siteTitle: "SecondFactor Docs",
    // The SDK pages (`sdk-*.md`) get their own group below the HTTP reference.
    sidebar: [
      {
        text: "API reference",
        items: pages.filter(({ file }) => !file.startsWith("sdk-")).map(({ text, link }) => ({ text, link })),
      },
      {
        text: "SDKs",
        items: pages.filter(({ file }) => file.startsWith("sdk-")).map(({ text, link }) => ({ text, link })),
      },
    ],
    outline: [2, 3],
    search: { provider: "local" },
    nav: [{ text: "Dashboard", link: `${appUrl}/dashboard` }],
    // Read by theme/SiteFooter.vue. The columns mirror the footer on
    // secondfactor.ai, with "Docs" pointing at this site.
    footer: {
      columns: [
        [
          { text: "Home", link: `${siteUrl}/` },
          { text: "Channels", link: `${siteUrl}/channels/` },
          { text: "Pricing", link: `${siteUrl}/pricing/` },
          { text: "Docs", link: "/" },
          { text: "Blog", link: `${siteUrl}/blog/` },
        ],
        [
          { text: "SMS", link: `${siteUrl}/channels/sms/` },
          { text: "WhatsApp", link: `${siteUrl}/channels/whatsapp/` },
          { text: "Viber", link: `${siteUrl}/channels/viber/` },
          { text: "RCS", link: `${siteUrl}/channels/rcs/` },
        ],
        [
          { text: "Support", link: `${siteUrl}/support/` },
          { text: "Privacy Policy", link: `${siteUrl}/privacy/` },
          { text: "Terms and Conditions", link: `${siteUrl}/terms/` },
        ],
      ],
      linkedin: "https://www.linkedin.com/company/secondfactorai/home",
      llms: `${apiUrl}/llms.txt`,
    },
  },
  vite: {
    // Static files sit at the repository root rather than inside `content/`,
    // so `content/` holds only the pages and stays a plain copy of `api_docs/`.
    publicDir: path.resolve(__dirname, "../public"),
  },
});
