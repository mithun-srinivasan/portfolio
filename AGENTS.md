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
- `blog.html` — post index. Add posts by editing the `window.POSTS` array near the bottom (`title`, `date`, `dateTime`, `excerpt`, `url`).
- `talks.html` — talk index. Add talks by editing the `window.TALKS` array near the bottom (`title`, `date`, `dateTime`, `event`, `location`, `url`).
- `style.css` — all shared styling and design tokens.
- `script.js` — theme toggle, scroll progress, active nav, copy email, IST clock, hero typewriter, hero comet card, post/talk rendering, footer terminal.
- `assets/logos/` — red/white/black project marks used by the work covers.

`Mithun Srinivasan*.html` (including `- very first one` and `.v1`) are historical references. Do not edit or delete them unless explicitly asked.

## Hard design constraints

- Strict red / white / black palette. Do not add a fourth hue.
- Dark-first. `:root[data-theme="dark"]` is the primary theme; blood red is `--blood:#78080f`.
- All text uses JetBrains Mono (loaded from Google Fonts). Do not reintroduce the old Bricolage Grotesque display font.
- Keep the first-version dot/mesh background on `body` (22px dots + 88px mesh lines).
- Keep a real terminal in the footer (`#term`), not a screenshot.
- Keep the AI-assistance disclosure in all three page footers. The footer copy should say AI-assisted, not hand-written.
- Keep the hero portrait permanently red/white duotone. The comet card may tilt and add a white specular glare on fine-pointer hover; do not add a grayscale-to-color or hue-changing hover.
- Contact and footer must follow the active theme: blood-red band and black footer in dark; paper contact/footer in light. The footer terminal stays black in both.
- Project covers use their own marks from `assets/logos/`; keep them inside the red / white / black palette.
- ricing/terminal cues are intentional: window dots, `~/` paths, lowercase commands, bordered squares, hard shadows. Keep them restrained; do not turn the site into a Hyprland mockup.

## Theme and terminal gotchas

- An inline script in each `<head>` sets `data-theme` before paint. Do not remove it or move it below the stylesheet; it prevents a light flash.
- `localStorage` key is `theme`; values are `dark` and `light`.
- Terminal prompt is page-specific via `data-prompt` on `#term`. Echoed commands use that attribute in `script.js`.
- Terminal output uses `innerHTML` for static strings and `esc()` for user input. Escape any new dynamic content. Avoid literal `<file>` in help text — it is parsed as a tag; use `FILE`.
- `help` is the terminal's built-in command reference. Keep it in sync when adding commands.

## Conventions

- Semantic HTML, lowercase UI copy, `aria-current` on the active nav link.
- CSS is organised by component with section comments; shared tokens live at the top of `style.css`.
- No dependencies, bundlers, or generated assets. Keep deployment to plain static files (root serves `index.html`).
