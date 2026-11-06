# AGENTS.md

Static personal portfolio for Mithun Srinivasan. No framework, no package manager, no build step. Live at `https://mithunsrinivasan.is-a.dev` (GitHub Pages, repo root on `main`).

## Run and verify

```powershell
python -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
```

A server is required: the shared stylesheet and icons use root-relative paths, so `file://` loads render unstyled.

There is no test suite. Verify by loading the pages and exercising the UI:

```powershell
agent-browser --session portfolio open http://127.0.0.1:4173/index.html
agent-browser --session portfolio set viewport 390 844
agent-browser --session portfolio screenshot --full out.png
```

Check dark and light themes, 390px width, `blog.html`, `talks.html`, and the footer terminal's `help` command.

## File map

- `index.html` — home: hero, work, experience ("Where I work" + education), community (open-source contributions), skills, contact.
- `blog.html` — post index. Add entries to `window.POSTS` in `assets/js/posts.js` (`title`, `date`, `dateTime`, `excerpt`, `url`).
- `talks.html` — talk index. Add talks by editing the `window.TALKS` array near the bottom (`title`, `date`, `dateTime`, `event`, `location`, `url`).
- `posts/hi.html` — the first static post; copy `posts/_template.html` for the next one, then update its title, metadata, date, and article body.
- `feed.xml` — Atom feed. Keep it current with `window.POSTS` and each static post, and keep it committed (it is linked from `blog.html` and every post).
- `404.html`, `manifest.webmanifest`, `sitemap.xml`, and `robots.txt` — static site metadata and not-found page.
- `CNAME` — GitHub Pages custom domain.
- `de4a7c5906b82f13.txt` — IndexNow key file at the root (proves ownership for Bing/Yandex URL submission). Keep it, and keep the filename matching the key inside.
- `assets/css/style.css` — all shared styling and design tokens.
- `assets/js/script.js` — shared theme, navigation, command palette, post/talk rendering, pointer effects, and terminal behavior; `assets/js/posts.js` contains the post list.
- `assets/images/` — responsive 480px, 720px, and 900px hero portrait sources in WebP with JPG fallbacks, `site-icon.svg` (brand mark and icon source), and `og-image.png`/`og-image.svg` (share card).
- `assets/fonts/` — one self-hosted `jetbrains-mono-latin-wght-normal.woff2` file and its OFL license.
- `assets/icons/` — apple touch icon and installable web app icons generated from `site-icon.svg`.
- `assets/logos/` — red/white/black project marks used by the work covers.
- `README.md` — project overview, structure, and editing notes.
- `THIRD_PARTY_NOTICES.md` — attribution for the native dotted-glow effect reference.

## Hard design constraints

- Strict red / white / black palette. Do not add a fourth hue.
- Dark-first. `:root[data-theme="dark"]` is the primary theme; blood red is `--blood:#78080f`.
- All text uses self-hosted JetBrains Mono WOFF2, with Tamil-capable system fallbacks. Do not reintroduce remote font requests or the old Bricolage Grotesque display font.
- The closing motto lives in the shared footer (`.footer-motto`, above `.footer-bottom`) on every page. It is the only mixed-script copy on the site: keep `lang="ta"` on the Tamil line so it renders with the correct fallback. The trailing emoji are deliberately full colour (`💯🏃`) and are the one sanctioned exception to the palette rule; do not grayscale them again.
- Keep the first-version dot/mesh background on `body` (22px dot spacing + 88px mesh lines). The masked hero canvas adds a separate red-and-white glow that pulses independently, does not react to pointer movement, and becomes static under reduced motion.
- Keep a real terminal in the footer (`#term`), not a screenshot.
- Keep the AI-assistance disclosure in every page footer. The footer copy should say AI-assisted, not hand-written.
- Keep the hero portrait permanently red/white duotone. The comet card may tilt and add a white specular glare on fine-pointer hover; do not add a grayscale-to-color or hue-changing hover.
- Contact and footer must follow the active theme: blood-red band and black footer in dark; paper contact/footer in light. The footer terminal stays black in both.
- Project covers use their own marks from `assets/logos/`; keep them inside the red / white / black palette. Marks on `.cover-ditch` and `.cover-spank` sit on black, so draw them in white/red rather than black.
- ricing/terminal cues are intentional: window dots, `~/` paths, lowercase commands, bordered squares, hard shadows. Keep them restrained; do not turn the site into a Hyprland mockup.

## Theme and terminal gotchas

- An inline script in each `<head>` sets `data-theme` before paint. Do not remove it or move it below the stylesheet; it prevents a light flash.
- `localStorage` key is `theme`; values are `dark` and `light`.
- Terminal prompt is page-specific via `data-prompt` on `#term`. Echoed commands use that attribute in `assets/js/script.js`.
- Terminal output uses `innerHTML` for static strings and `esc()` for user input. Escape any new dynamic content. Avoid literal `<file>` in help text — it is parsed as a tag; use `FILE`.
- `help` is the terminal's built-in command reference. Keep it in sync when adding commands.
- The command palette is available with Ctrl/Cmd+K or `/`; keep its native `<dialog>` and generated trigger in the shared script.
- Project filters, scroll reveal, marquee, text scramble, project spotlight, dotted-glow canvas, and back-to-top are native components; honor `prefers-reduced-motion` when changing their behavior. The filter bar is a `radiogroup` with roving tabindex and arrow-key support. The hero dotted glow has no pointer response; reduced motion renders a static field.
- Terminal commands include `open PROJECT`, `skills`, `experience`, `theme [dark|light]`, and the shell extras `cd`, `echo`, `uname`, `sudo`, and `rm`; `?` aliases `help`, Tab completes commands, Ctrl+C clears the current input, and `help` must stay current.
- Canonical, Open Graph, JSON-LD, sitemap, feed, and robots URLs target `https://mithunsrinivasan.is-a.dev`.
- The home page's first JSON-LD block is the identity graph (`WebSite` + `ProfilePage` + `Person` with `@id` anchors). Keep its `sameAs` array and the `<link rel="me">` tags in sync whenever a new public profile is added — that pairing is what tells search engines which "Mithun Srinivasan" this site belongs to.
- The favicon set is identical on every page: `/favicon.ico`, `/assets/images/site-icon.svg`, and `/assets/icons/icon-192.png` (note `icons`, not `images`). The 404 page and posts must use root-relative paths.
- Never ship placeholder metadata. Do not add `google-site-verification` with a `TODO` value, and do not leave `TODO` comments in rendered copy.
- `og:image` is the 1200x630 terminal share card, so `og:image:alt` and `twitter:image:alt` describe the card, not the portrait.
- To activate the custom domain, register `mithunsrinivasan.is-a.dev` with is-a.dev first, then set it in the repository's GitHub Pages settings and enable HTTPS. The is-a.dev record should CNAME to `mithun-srinivasan.github.io`.
- Keep the blog's `<noscript>` list, `sitemap.xml`, and `feed.xml` current with `window.POSTS` when posts are added.
- The Blog navigation link stays hidden while `window.POSTS` is empty; the blog empty state is visitor-facing copy.

## Conventions

- Semantic HTML, lowercase UI copy, `aria-current` on the active nav link.
- CSS is organised by component with section comments; shared tokens live at the top of `assets/css/style.css`.
- No dependencies, bundlers, or build step. Keep deployment to plain static files (root serves `index.html`).
- Keep generated binaries in sync with `assets/images/site-icon.svg`. There is no icon-generation script in the repo, so regenerate `favicon.ico` and the PNG icons by hand when the mark changes.
- Screenshots are local-only: `out*.png` and `/portfolio-*.png` are git-ignored. Do not commit verification images.
- Mobile is a first-class target. Below 620px the header collapses to one 58px row: the nav becomes a horizontally scrollable strip (hidden scrollbar) with a `›` fade affordance driven by the `nav-more` class in `assets/js/script.js`. Vertical position of anchor jumps comes from `--header-h`, which the script keeps in sync with the real header height via `ResizeObserver`; never hard-code a `scroll-margin-top` again.
- Keep touch targets at 44px minimum (nav links, theme toggle, brand) and 36px+ for chips and inline links. Any `:hover` transform or shadow that would stick after a tap belongs behind `@media (hover:none)` resets. Respect `env(safe-area-inset-*)` on the header top, footer bottom, and `.to-top`.
