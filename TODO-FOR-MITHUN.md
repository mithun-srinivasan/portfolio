# TODO for Mithun

Real information only you can supply. Nothing here is linked from the site, and the site works without it.

## Assets

- [ ] Résumé PDF at `assets/Mithun-Srinivasan-Resume.pdf`. The home page shows a `resume` link only when that file exists at build time, so right now it is simply absent rather than pointing at a 404.

- [ ] `assets/logos/spank-for-windows.svg` still draws "SPANK" with an SVG `<text>` element, so it depends on the visitor having JetBrains Mono or a monospace fallback. Converting it to paths needs a font-outline tool that isn't installed here.

- [ ] A screenshot or short GIF for each project. Save it as `assets/images/projects/<project-slug>.webp` and rebuild; the card shows it lazily with real width and height, and shows nothing at all until the file exists. The slugs are `ditch-windows`, `srigurugranthsahib`, `meeting-transcriber-and-summarizer`, `spank-for-windows`, `sticker-brains`.

## Links

- [ ] Verify `https://cal.com/mithun-srinivasan/30min` still resolves and accepts bookings.

## Pages

- [ ] `uses.html` covers only tools the rest of the site already names. Add the missing specifics: your machine and its specs, your dotfiles repository (nvim and zsh configs), your terminal and prompt setup, and anything you read regularly.
- [ ] `now.html` is generated from facts already on the site. Update it by hand when it goes stale — the "last updated" line follows the file's real commit date, so a commit is all it needs.

## Projects

- [ ] meeting-transcriber-and-summarizer, spank-for-windows and sticker-brains need a real outcome: stars, downloads, users, or what you learned. Their outcome lines were removed because they only restated the description.

- [ ] A short ditch-windows case study would be worth writing: it won Best Use of Gemma 4 and an Arduino UNO Q at Hacktoberfest Hack Day Chennai. It is a good candidate for the first real post in `content/posts/`.

## Talks

- [ ] Real dates for both talks. They are currently stored as `2026` because the month and day are unknown; the talk list can render `YYYY-MM` as `Oct 2026` and `YYYY-MM-DD` as `12 Oct 2026` once you fill them in.
- [ ] Real slide or video links. Both talks currently point at their GitHub repositories.
