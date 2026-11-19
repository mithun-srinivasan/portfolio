# Mithun Srinivasan — Portfolio

A static personal portfolio built with semantic HTML, CSS, and vanilla JavaScript. No framework. Plain static files, generated from Markdown by a small Node script.

Live at <https://mithunsrinivasan.is-a.dev>.

## Pages

- `index.html` — home: hero, selected work, experience ("Where I work" + education), community (open-source contributions), skills, and contact.
- `blog.html` — writing index, rendered from `content/posts/*.md` by `scripts/build.mjs`. The Blog navigation link stays hidden until at least one post is published.
- `talks.html` — talk index, rendered from `content/talks.json`.
- `404.html` — static not-found page (`noindex`).
- `posts/hi.html` — the first static post; regenerated from `content/posts/2026-11-01-hi.md`.
- `posts/_template.html` — copyable static post page template (`noindex`).
- `feed.xml` — Atom feed for the published posts.
- `manifest.webmanifest`, `sitemap.xml`, and `robots.txt` — static site metadata.

## Structure

```text
.
├── index.html
├── blog.html
├── talks.html
├── 404.html
├── posts/
│   ├── hi.html
│   └── _template.html
├── feed.xml
├── manifest.webmanifest
├── sitemap.xml
├── robots.txt
├── CNAME
├── favicon.ico
├── README.md
├── AGENTS.md
├── THIRD_PARTY_NOTICES.md
├── content/
│   ├── posts/
│   │   ├── 2026-11-01-hi.md
│   │   └── _TEMPLATE.md.txt
│   └── talks.json
├── scripts/
│   ├── build.mjs
│   ├── check.mjs
│   ├── new.mjs
│   ├── publish.mjs
│   └── studio/
│       ├── studio.mjs
│       └── index.html
└── assets/
    ├── fonts/
    │   ├── jetbrains-mono-latin-wght-normal.woff2
    │   └── OFL.txt
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── posts.js
    │   └── script.js
    ├── icons/
    │   ├── apple-touch-icon.png
    │   ├── icon-192.png
    │   └── icon-512.png
    ├── images/
    │   ├── mithun-portrait-{480,720,900}.{webp,jpg}
    │   ├── og-image.png
    │   ├── og-image.svg
    │   └── site-icon.svg
    └── logos/
        └── ...
```

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the dotted-glow effect reference.

## Mobile behaviour

The layout is tuned for phones first, not downscaled from desktop.

- **Compact header.** Below 620px the header is a single 58px row instead of wrapping to two rows. The nav turns into a horizontally scrollable strip with its scrollbar hidden; a red `›` with a gradient fade appears on the right edge while more links sit off-screen, and disappears once you scroll to the end.
- **Anchor offsets stay correct.** `assets/js/script.js` writes the live header height to the `--header-h` custom property through a `ResizeObserver`, so `scroll-padding-top` and `.section[id]` scroll margins can never drift as the header changes.
- **Touch targets.** Nav links, the theme toggle, and the brand mark are 44px; chips are 36px; inline links get extra vertical padding.
- **No sticky hover.** Everything that lifts or glows on `:hover` is reset inside `@media (hover:none)`, so tapped cards and buttons do not stay in their hover state.
- **Safe areas.** `env(safe-area-inset-*)` is applied to the header top, footer bottom, and back-to-top button for notched devices.
- **No zoom-on-focus.** The terminal input is forced to 16px on small screens so iOS does not zoom the page when it is focused.

## Preview locally

From the project root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. A local server is required — the shared stylesheet, icons, and feed use root-relative paths (`/assets/...`), so opening the HTML directly from disk will not load the styles.

## Editing content

- **Posts:** write a Markdown file in `content/posts/YYYY-MM-DD-slug.md` with frontmatter (`title`, `slug`, `date`, `description` ≤155 chars, `draft`, `tags`) and a Markdown body. Copy `content/posts/_TEMPLATE.md.txt` for a ready-made frontmatter block and Markdown cheat sheet. Then run `node scripts/build.mjs` to regenerate `posts/<slug>.html`, `assets/js/posts.js`, `blog.html`, `sitemap.xml`, and `feed.xml`. Draft posts stay out of the feed, sitemap, and blog index until you set `draft: false`.
- **Talks:** edit `content/talks.json` (each entry: `title`, `date` as `YYYY-MM` or `YYYY-MM-DD`, `event`, `location`, `url`, optional `linkLabel`, `draft`). Then run `node scripts/build.mjs` to regenerate `talks.html`.
- **New post shortcut:** `node scripts/new.mjs post "A title"` creates a draft Markdown file and prints the next commands. `talk` works the same way for `content/talks.json`.
- **Studio (local editor):** `node scripts/studio.mjs` starts a token-protected editor on `http://127.0.0.1:4321` for editing posts/talks, previewing Markdown, uploading images to `assets/images/posts/<slug>/`, and publishing with one button.
- **Canonical URLs:** page metadata, JSON-LD, `sitemap.xml`, `feed.xml`, and `robots.txt` use `https://mithunsrinivasan.is-a.dev`.
- **Styles:** shared tokens and component styles live in `assets/css/style.css`.
- **Behaviour:** theme, navigation, typewriter, portrait card, post/talk rendering, pointer effects, and terminal live in `assets/js/script.js`; post content lives in `assets/js/posts.js`. There is no network or GitHub API call at runtime.
- **Interactions:** Ctrl/Cmd+K opens the native command palette; work filters use a keyboard-operable radio group; scroll reveal, tools marquee, heading scramble, red project spotlight, toast, and back-to-top remain dependency-free.
- **Background:** a fixed body layer holds the 22px dot grid and 88px mesh. The hero also draws a masked dotted glow; a few red dots pulse independently, it does not respond to pointer movement, and it becomes static for reduced motion.
- **Terminal:** `help` lists every command, including `open PROJECT`, `skills`, `experience`, `theme [dark|light]`, `rss` for the Atom feed, and shell extras like `cd`, `echo`, `uname`, `sudo`, and `rm`; `?` aliases `help`, Tab completes commands, and Ctrl+C clears the current input.
- **Brand mark and icons:** `assets/images/site-icon.svg` is the header mark and the source of truth for `favicon.ico`, `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, and `assets/icons/apple-touch-icon.png`. Keep the ICO at true 16/32/48 sizes and keep the touch icon opaque (no transparency).

## Publishing

Three paths, each no more than five commands:

1. **Studio (local, recommended):** `node scripts/studio.mjs` → open the token URL → write/edit → save → click **Publish**. It builds, runs checks, commits (`post:`/`talk:`/`chore:`), and pushes. Aborts if `check.mjs` fails or the tree has unrelated changes.
2. **GitHub web / phone:** create `content/posts/YYYY-MM-DD-slug.md` or edit `content/talks.json` in the GitHub web editor, commit to `main`. The CI workflow (`.github/workflows/build.yml`) builds, commits regenerated files back as `github-actions[bot]`, and runs checks. Pull requests only verify — they never push. In *Settings → Actions → General → Workflow permissions*, set it to **"Read and write"** so the push step can commit back to `main`.
3. **CLI:** edit `content/posts/*.md` or `content/talks.json` locally, run `node scripts/build.mjs` then `node scripts/check.mjs`, then `node scripts/publish.mjs --yes` (prompts before commit/push unless `--yes`).

All paths produce plain static files; GitHub Pages serves `index.html` from the `main` branch root. Nothing is ever pushed without a successful `check.mjs` run.

## Writing tips

- **Description first:** write the `description` field before the body — it becomes the search snippet, feed summary, and card description. Keep it ≤155 chars.
- **Draft while writing:** keep `draft: true` until the post is ready; only `draft: false` posts appear in the feed, sitemap, and blog index.
- **Title length:** the page title appends ` · Mithun Srinivasan`, so keep the post title under 38 chars if you want the full title within 60.
- **Talk dates:** use real `YYYY-MM` or `YYYY-MM-DD` dates; year-only dates render but trigger a build warning (see `TODO-FOR-MITHUN.md`). Fill in real slide/video links on talk day.
- **Images:** save post images under `assets/images/posts/<slug>/` and reference them with absolute `/assets/…` paths. Never edit `posts/<slug>.html` by hand — the next build overwrites it.
- **Validation:** `node scripts/check.mjs` runs after every build and catches broken links, duplicate titles, missing canonical/JSON-LD, and stale generated output before anything is published.

## Deployment

Deploy the repository root as plain static files. The host should serve `index.html` as the directory index. GitHub Pages publishes directly from the `main` branch root.

To activate `mithunsrinivasan.is-a.dev`, register it with is-a.dev, then set it as the custom domain in this repository's GitHub Pages settings and enable HTTPS. The is-a.dev record should CNAME to `mithun-srinivasan.github.io`.

The footer on every page includes an AI-assistance disclosure.

## Getting indexed

Publishing a page does not put it in search results; the crawler has to be told.

- **Google:** verify the site in [Search Console](https://search.google.com/search-console) (HTML tag or the uploaded HTML file — either is a one-line change to `index.html` or a single file at the root), then submit `sitemap.xml` under *Sitemaps* and use *URL inspection → Request indexing* for the home page. Nothing in the repo can do this step; it needs the account owner.
- **Bing / Yandex / DuckDuckGo:** handled by IndexNow. The root key file `de4a7c5906b82f13.txt` proves ownership, and URLs are submitted to `https://api.indexnow.org/indexnow` after a change (a `202 Accepted` response means it was queued).
- **Identity:** search engines decide *which* person a name refers to from repeated, linked signals. The `Person` schema `sameAs` array, the `<link rel="me">` tags, and the same name/handle on GitHub, LinkedIn, FOSS United, X, Instagram, Mastodon, and Notion are what tie this site to the right Mithun Srinivasan. A site never outranks profiles for a personal name without those links pointing back.

`robots.txt` allows everything and advertises the sitemap, so no page needs authorising beyond that.

## SEO checklist

When adding a post or page:

1. **Title:** `<= 60` chars, unique, no pipe-dump.
2. **Description:** `<= 155` chars, unique. Reuse for `og:description` and `twitter:description`.
3. **Social tags:** `og:locale=en_IN`, `og:image:alt`, `twitter:image:alt`, `twitter:site=@simply_mithun`, `twitter:creator=@simply_mithun`.
4. **Favicon:** identical `<link rel="icon">` set on every page (`/favicon.ico`, `/assets/images/site-icon.svg`, `/assets/icons/icon-192.png`); root-relative on 404 and posts.
5. **JSON-LD:** every block must parse. Index: first block is the identity graph (`WebSite` + `ProfilePage` + `Person`, joined by `@id` anchors, with `sameAs` pointing at every public profile); second block is `SoftwareSourceCode` for projects. Blog/talks: `CollectionPage` + `ItemList`. Posts: `BlogPosting` + `BreadcrumbList`.
6. **`rel="me"`:** seven `<link rel="me">` tags in the home page `<head>` (GitHub, LinkedIn, FOSS United, X, Instagram, Mastodon, Notion) plus the Mastodon social link in the footer. Add a new profile to both places at once.
7. **Sitemap:** add the URL with a `<lastmod>`, and bump dates for pages whose content changed. Keep `posts/_template.html` out of the sitemap and `noindex`.
8. **`content/posts/*.md` / `content/talks.json`:** keep the source of truth in sync with static HTML `<noscript>` lists, `sitemap.xml`, and `feed.xml` — `scripts/build.mjs` regenerates all of them.
9. **Contact:** the site publishes an email address and a booking link only. There is no phone number, so do not add a `tel:` link or a phone field to structured data.
10. **Validate:** run `node scripts/check.mjs` (it syntax-checks scripts, checks one h1 per page, unique titles ≤60 chars, canonical except 404, valid JSON-LD, no TODO markers, no duplicate ids, resolves all local references, verifies sitemap/feed/sitemap sync with sources, and confirms build idempotence).
