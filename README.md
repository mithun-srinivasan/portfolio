# Mithun Srinivasan — Portfolio

A static personal portfolio built with semantic HTML, CSS, and vanilla JavaScript. There are no dependencies, no package manager, and no build step.

## Pages

- `index.html` — home: hero, selected work, about, experience, skills, and contact.
- `blog.html` — writing index, rendered from the `window.POSTS` array. The Blog navigation link stays hidden until that array has an entry.
- `talks.html` — talk index, rendered from the `window.TALKS` array.

## Structure

```text
.
├── index.html
├── blog.html
├── talks.html
├── README.md
├── AGENTS.md
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── script.js
    ├── images/
    │   ├── mithun-portrait.webp
    │   └── mithun-portrait.jpg
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
- **Talks:** edit `window.TALKS` near the bottom of `talks.html`.
- **Styles:** shared tokens and component styles live in `assets/css/style.css`.
- **Behaviour:** theme, navigation, typewriter, portrait card, and terminal live in `assets/js/script.js`.

## Deployment

Deploy the repository root as plain static files. The host should serve `index.html` as the directory index. GitHub Pages can publish directly from the `main` branch root.

The footer on every page includes an AI-assistance disclosure.
