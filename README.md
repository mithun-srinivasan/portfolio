# Mithun Srinivasan — Portfolio

A static personal portfolio built with semantic HTML, CSS, and vanilla JavaScript. There are no dependencies, no package manager, and no build step.

Live at <https://mithunsrinivasan.is-a.dev>.

## Pages

- `index.html` — home: hero, selected work, experience ("Where I work" + education), community (open-source contributions), skills, and contact.
- `blog.html` — writing index, rendered from the `window.POSTS` array in `assets/js/posts.js`. The Blog navigation link stays hidden until that array has an entry.
- `talks.html` — talk index, rendered from the `window.TALKS` array.
- `404.html` — static not-found page (`noindex`).
- `posts/hi.html` — the first static post, with the shared header and footer.
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

## Preview locally

From the project root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. A local server is required — the shared stylesheet, icons, and feed use root-relative paths (`/assets/...`), so opening the HTML directly from disk will not load the styles.

## Editing content

- **Posts:** edit `window.POSTS` in `assets/js/posts.js`.
- **Static posts:** copy `posts/_template.html` and replace its metadata, date, title, and article body; add its URL and summary to `window.POSTS`, the blog's `<noscript>` list, `sitemap.xml`, and `feed.xml`.
- **Talks:** edit `window.TALKS` near the bottom of `talks.html`.
- **Canonical URLs:** page metadata, JSON-LD, `sitemap.xml`, `feed.xml`, and `robots.txt` use `https://mithunsrinivasan.is-a.dev`.
- **Styles:** shared tokens and component styles live in `assets/css/style.css`.
- **Behaviour:** theme, navigation, typewriter, portrait card, post/talk rendering, pointer effects, and terminal live in `assets/js/script.js`; post content lives in `assets/js/posts.js`. There is no network or GitHub API call at runtime.
- **Interactions:** Ctrl/Cmd+K opens the native command palette; work filters use a keyboard-operable radio group; scroll reveal, tools marquee, heading scramble, red project spotlight, toast, and back-to-top remain dependency-free.
- **Background:** a fixed body layer holds the 22px dot grid and 88px mesh. The hero also draws a masked dotted glow; a few red dots pulse independently, it does not respond to pointer movement, and it becomes static for reduced motion.
- **Terminal:** `help` lists every command, including `open PROJECT`, `skills`, `experience`, `theme [dark|light]`, and shell extras like `cd`, `echo`, `uname`, `sudo`, and `rm`; `?` aliases `help`, Tab completes commands, and Ctrl+C clears the current input.
- **Brand mark and icons:** `assets/images/site-icon.svg` is the header mark and the source of truth for `favicon.ico`, `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, and `assets/icons/apple-touch-icon.png`. Keep the ICO at true 16/32/48 sizes and keep the touch icon opaque (no transparency).

## Deployment

Deploy the repository root as plain static files. The host should serve `index.html` as the directory index. GitHub Pages publishes directly from the `main` branch root.

To activate `mithunsrinivasan.is-a.dev`, register it with is-a.dev, then set it as the custom domain in this repository's GitHub Pages settings and enable HTTPS. The is-a.dev record should CNAME to `mithun-srinivasan.github.io`.

The footer on every page includes an AI-assistance disclosure.

## SEO checklist

When adding a post or page:

1. **Title:** `<= 60` chars, unique, no pipe-dump.
2. **Description:** `<= 155` chars, unique. Reuse for `og:description` and `twitter:description`.
3. **Social tags:** `og:locale=en_IN`, `og:image:alt`, `twitter:image:alt`, `twitter:site=@simply_mithun`, `twitter:creator=@simply_mithun`.
4. **Favicon:** identical `<link rel="icon">` set on every page (`/favicon.ico`, `/assets/images/site-icon.svg`, `/assets/icons/icon-192.png`); root-relative on 404 and posts.
5. **JSON-LD:** every block must parse. Index: `@graph` with `WebSite`, `ProfilePage` (mainEntity `Person`), `Person`, `SoftwareSourceCode` for projects. Blog/talks: `CollectionPage` + `ItemList`. Posts: `BlogPosting` + `BreadcrumbList`.
6. **`rel="me"`:** in `<head>` and on the Mastodon social link.
7. **Sitemap:** add the URL with a `<lastmod>`, and bump dates for pages whose content changed. Keep `posts/_template.html` out of the sitemap and `noindex`.
8. **`window.POSTS` / `window.TALKS`:** keep the source of truth in sync with static HTML `<noscript>` lists, `sitemap.xml`, and `feed.xml`.
9. **Phone number:** only in `index.html` contact section (tel link). Never in structured data.
10. **Validate:** run `node --check assets/js/script.js`; verify every JSON-LD block parses; check one h1 per page; confirm canonical is present (except 404); confirm every local `href`/`src` resolves.
