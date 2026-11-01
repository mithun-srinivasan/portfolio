# Mithun Srinivasan — Portfolio

A static personal portfolio built with semantic HTML, CSS, and vanilla JavaScript. There are no dependencies, no package manager, and no build step.

## Pages

- `index.html` — home: hero, selected work, about, experience, skills, and contact.
- `blog.html` — writing index, rendered from the `window.POSTS` array. The Blog navigation link stays hidden until that array has an entry.
- `talks.html` — talk index, rendered from the `window.TALKS` array.
- `404.html` — static not-found page.
- `posts/_template.html` — static post page template with the shared header and footer.
- `site.webmanifest`, `sitemap.xml`, and `robots.txt` — static site metadata.

## Structure

```text
.
├── index.html
├── blog.html
├── talks.html
├── 404.html
├── posts/
│   └── _template.html
├── site.webmanifest
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
    │   └── script.js
    ├── data/
    │   └── github-contributions.json
    ├── images/
    │   ├── mithun-portrait-{480,720,900}.{webp,jpg}
    │   ├── og-image.png
    │   └── apple-touch-icon.png
    └── logos/
        └── ...
```

## Preview locally

From the project root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. The site can also be opened directly from `index.html`.

## Editing content

- **Posts:** edit `window.POSTS` near the bottom of `blog.html`.
- **Static posts:** copy `posts/_template.html` and replace its metadata, date, title, and article body; add its URL and summary to `window.POSTS` and the blog's `<noscript>` list.
- **Talks:** edit `window.TALKS` near the bottom of `talks.html`.
- **Canonical URLs:** replace the `SITE_URL` placeholder in page metadata, `sitemap.xml`, and `robots.txt` before deployment.
- **Resume:** place the supplied PDF at `assets/resume.pdf`.
- **Styles:** shared tokens and component styles live in `assets/css/style.css`.
- **Behaviour:** theme, navigation, typewriter, portrait card, and terminal live in `assets/js/script.js`.
- **Interactions:** Ctrl/Cmd+K opens the native command palette; work filters, scroll reveal, tools marquee, heading scramble, card spotlight, toast, and back-to-top need no runtime dependencies. Reveal and marquee motion honor reduced-motion settings.
- **Terminal:** `help` lists `open PROJECT`, `skills`, `experience`, and `theme [dark|light]`; Tab completes commands and Ctrl+C clears the current input.
- **Contribution snapshot:** refresh `assets/data/github-contributions.json` from the public GitHub calendar and update its `updated` date.

## Deployment

Deploy the repository root as plain static files. The host should serve `index.html` as the directory index. GitHub Pages can publish directly from the `main` branch root.

The footer on every page includes an AI-assistance disclosure.
