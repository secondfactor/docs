# SecondFactor Docs

The public API documentation for SecondFactor, built with
[VitePress](https://vitepress.dev) into a static site that can be hosted
anywhere (Cloudflare Pages, GitHub Pages, any static file server).

## Running it

Node 18 or newer, VitePress's minimum.

```bash
npm install
npm run dev       # live-reloading development server
npm run build     # static site in .vitepress/dist/
npm run preview   # serve the built site on http://localhost:4301
```

The site links to production by default, matching the examples in the pages,
which all call `api.secondfactor.ai`. Two optional environment variables, the
same ones the dashboard's frontend build uses, point a build elsewhere:

| Variable | Used for | Default |
|---|---|---|
| `VITE_WEB_URL` | The "Dashboard" link in the header. | `https://app.secondfactor.ai` |
| `VITE_API_URL` | The `llms.txt` link in the footer. | `https://api.secondfactor.ai` |

## Layout

| Path | What lives there |
|---|---|
| `content/` | The pages, one markdown file each. `README.md` is the Getting started page at the site root. |
| `public/` | Logos and the favicon, served as they are. |
| `.vitepress/config.mts` | Site configuration: sidebar order, request-example tabs, copy-button data, raw markdown publishing, header and footer links. |
| `.vitepress/theme/` | The theme: brand colours and fonts (`brand.css`), the copy buttons, the footer and the language-tab sync. |

## Writing pages

- Each page has `title`, `description` and `order` frontmatter. The sidebar
  lists pages by `order`.
- Link between pages as `./send-otp.md#section`. The links work on GitHub, in
  the dashboard and on this site.
- A request example is a run of adjacent code blocks in `bash`, `python`, `js`,
  `java`, `rust` and `go`, in that order. This site shows the run as one block
  with a tab per language; anywhere else it reads as consecutive blocks.
- Keep the pages plain GitHub-flavoured markdown, with no VitePress-only syntax,
  because the dashboard renders the same files.

## Keeping in step with the dashboard

`content/` is a copy of `api_docs/` in the
[secondfactor.ai](https://github.com/lambda-payments/secondfactor.ai)
repository, which the dashboard's Docs tab bundles. A change to a page belongs
in both places until the dashboard reads its docs from here.

The SDK pages (`content/sdk-*.md`) are the exception: they live only here, and
are updated when a release of `secondfactor-node`, `secondfactor-python` or
`secondfactor-js` changes the public API.
