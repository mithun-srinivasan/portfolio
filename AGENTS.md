# AGENTS.md

Static personal portfolio for Mithun Srinivasan. No framework, no package manager, no build step.

## Run and verify

```powershell
python -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
```

There is no test suite. Verify by loading the pages and exercising the UI:

```powershell
agent-browser --session portfolio open http://127.0.0.1:4173/index.html
agent-browser --session portfolio set viewport 390 844
agent-browser --session portfolio screenshot --full out.png
```

Check dark and light themes, 390px width, `blog.html`, `talks.html`, and the footer terminal's `help` command.

## File map

- `index.html` — home: hero, work, about, experience, skills, contact.
- `blog.html` — post index. Add entries to `window.POSTS` in `assets/js/posts.js` (`title`, `date`, `dateTime`, `excerpt`, `url`).
- `talks.html` — talk index. Add talks by editing the `window.TALKS` array near the bottom (`title`, `date`, `dateTime`, `event`, `location`, `url`).
- `posts/_template.html` — copy this as a static post page, then update its title, metadata, date, and article body.
- `404.html`, `manifest.webmanifest`, `sitemap.xml`, and `robots.txt` — static site metadata and not-found page.
- `assets/css/style.css` — all shared styling and design tokens.
- `assets/js/script.js` — shared theme, navigation, palette, pulse, post/talk, pointer effects, and terminal behavior; `assets/js/posts.js` contains the post list.
- `assets/images/` — responsive 480px, 720px, and 900px hero portrait sources in WebP with JPG fallbacks, plus the share card.
- `assets/fonts/` — self-hosted JetBrains Mono variable WOFF2 and its OFL license.
- `assets/icons/` — apple touch icon and installable web app icons.
- `assets/data/github.json` — dated GitHub pulse totals and daily contribution snapshot.
- `assets/logos/` — red/white/black project marks used by the work covers.
- `README.md` — project overview, structure, and editing notes.
- `THIRD_PARTY_NOTICES.md` — attribution for the native dotted-glow effect reference.

## Hard design constraints

- Strict red / white / black palette. Do not add a fourth hue.
- Dark-first. `:root[data-theme="dark"]` is the primary theme; blood red is `--blood:#78080f`.
- All text uses self-hosted JetBrains Mono WOFF2, with Tamil-capable system fallbacks. Do not reintroduce remote font requests or the old Bricolage Grotesque display font.
- Keep the first-version dot/mesh background on `body` (22px dot spacing + 88px mesh lines). The tiny dots pulse independently; they do not react to pointer movement.
- Keep a real terminal in the footer (`#term`), not a screenshot.
- Keep the AI-assistance disclosure in all three page footers. The footer copy should say AI-assisted, not hand-written.
- Keep the hero portrait permanently red/white duotone. The comet card may tilt and add a white specular glare on fine-pointer hover; do not add a grayscale-to-color or hue-changing hover.
- Contact and footer must follow the active theme: blood-red band and black footer in dark; paper contact/footer in light. The footer terminal stays black in both.
- Project covers use their own marks from `assets/logos/`; keep them inside the red / white / black palette.
- ricing/terminal cues are intentional: window dots, `~/` paths, lowercase commands, bordered squares, hard shadows. Keep them restrained; do not turn the site into a Hyprland mockup.

## Theme and terminal gotchas

- An inline script in each `<head>` sets `data-theme` before paint. Do not remove it or move it below the stylesheet; it prevents a light flash.
- `localStorage` key is `theme`; values are `dark` and `light`.
- Terminal prompt is page-specific via `data-prompt` on `#term`. Echoed commands use that attribute in `assets/js/script.js`.
- Terminal output uses `innerHTML` for static strings and `esc()` for user input. Escape any new dynamic content. Avoid literal `<file>` in help text — it is parsed as a tag; use `FILE`.
- `help` is the terminal's built-in command reference. Keep it in sync when adding commands.
- The command palette is available with Ctrl/Cmd+K or `/`; keep its native `<dialog>` and generated trigger in the shared script.
- Project filters, scroll reveal, marquee, text scramble, dotted-glow canvas, and back-to-top are native components; honor `prefers-reduced-motion` when changing their behavior. The Dotted Glow uses tiny 0.55px dots over the body mesh, pulses red dots independently, and has no pointer response. Reduced motion renders a static field.
- Terminal commands include `open PROJECT`, `skills`, `experience`, and `theme [dark|light]`; Tab completes commands, Ctrl+C clears the current input, and `help` must stay current.
- Refresh `assets/data/github.json` from the public GitHub contribution calendar when updating the pulse; retain its source and `generated` date.
- Canonical, Open Graph, JSON-LD, sitemap, and robots URLs target `https://mithunsrinivasan.is-a.dev`.
- To activate the custom domain, register `mithunsrinivasan.is-a.dev` with is-a.dev first, then set it in the repository's GitHub Pages settings and enable HTTPS. The is-a.dev record should CNAME to `mithun-srinivasan.github.io`.
- Keep the blog's `<noscript>` list current with `window.POSTS` when posts are added.
- The Blog navigation link stays hidden while `window.POSTS` is empty; the blog empty state is visitor-facing copy.

## Conventions

- Semantic HTML, lowercase UI copy, `aria-current` on the active nav link.
- CSS is organised by component with section comments; shared tokens live at the top of `assets/css/style.css`.
- No dependencies, bundlers, or generated assets. Keep deployment to plain static files (root serves `index.html`).
