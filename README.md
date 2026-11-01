# Mithun Srinivasan — Portfolio

A static personal portfolio built with semantic HTML, CSS, and vanilla JavaScript. There are no dependencies, no package manager, and no build step.

## Pages

- `index.html` — home: hero, selected work, about, experience, skills, and contact.
- `blog.html` — writing index, rendered from the `window.POSTS` array in `assets/js/posts.js`. The Blog navigation link stays hidden until that array has an entry.
- `talks.html` — talk index, rendered from the `window.TALKS` array.
- `404.html` — static not-found page.
- `posts/_template.html` — static post page template with the shared header and footer.
- `manifest.webmanifest`, `sitemap.xml`, and `robots.txt` — static site metadata.

## Structure

```text
.
├── index.html
├── blog.html
├── talks.html
├── 404.html
├── posts/
│   └── _template.html
├── manifest.webmanifest
├── sitemap.xml
├── robots.txt
├── README.md
├── AGENTS.md
└── assets/
    ├── fonts/
    │   ├── jetbrains-mono-latin-variable.woff2
    │   └── OFL.txt
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── posts.js
    │   └── script.js
    ├── data/
    │   └── github.json
    ├── icons/
    │   ├── apple-touch-icon.png
    │   ├── icon-192.png
    │   └── icon-512.png
    ├── images/
    │   ├── mithun-portrait-{480,720,900}.{webp,jpg}
    │   ├── og-image.png
    │   └── apple-touch-icon.png
    └── logos/
        └── ...
```

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the React Bits Dot Grid source attribution and license.

## Preview locally

From the project root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. The site can also be opened directly from `index.html`.

## Editing content

- **Posts:** edit `window.POSTS` in `assets/js/posts.js`.
- **Static posts:** copy `posts/_template.html` and replace its metadata, date, title, and article body; add its URL and summary to `window.POSTS` and the blog's `<noscript>` list.
- **Talks:** edit `window.TALKS` near the bottom of `talks.html`.
- **Canonical URLs:** page metadata, JSON-LD, `sitemap.xml`, and `robots.txt` use `https://mithunsrinivasan.is-a.dev`.
- **Styles:** shared tokens and component styles live in `assets/css/style.css`.
- **Behaviour:** theme, navigation, typewriter, portrait card, pulse, and terminal live in `assets/js/script.js`; post content lives in `assets/js/posts.js`.
- **Interactions:** Ctrl/Cmd+K opens the native command palette; work filters, scroll reveal, tools marquee, heading scramble, project spotlight, hero Dot Grid background, toast, and back-to-top remain dependency-free. The Dot Grid supports pointer movement and click ripples. A red Dotted Glow follows fine-pointer movement across the shared body dot/mesh; it stays still with reduced motion.
- **Dot Grid source:** the hero background is a plain Canvas 2D port of React Bits' [Dot Grid](https://reactbits.dev/backgrounds/dot-grid) spring, cursor, and ripple behavior. The original dot/mesh background remains on `body`.
- **Terminal:** `help` lists `open PROJECT`, `skills`, `experience`, and `theme [dark|light]`; Tab completes commands and Ctrl+C clears the current input.
- **GitHub pulse:** `assets/data/github.json` holds the dated contribution calendar and summary totals; refresh it from the public profile when updating those figures.

## Deployment

Deploy the repository root as plain static files. The host should serve `index.html` as the directory index. GitHub Pages can publish directly from the `main` branch root.

To activate `mithunsrinivasan.is-a.dev`, register it with is-a.dev, then set it as the custom domain in this repository's GitHub Pages settings and enable HTTPS. The is-a.dev record should CNAME to `mithun-srinivasan.github.io`.

The footer on every page includes an AI-assistance disclosure.
