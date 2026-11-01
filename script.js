/* ==========================================================================
   mithun@portfolio — shared behaviour
   theme · scroll · copy · clock · hero typewriter · comet card · footer terminal
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const THEME_KEY = "theme";

  const isTheme = (value) => value === "light" || value === "dark";
  const currentTheme = () => (root.dataset.theme === "light" ? "light" : "dark");

  function readSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  }

  function syncThemeUI() {
    const dark = currentTheme() === "dark";
    if (themeMeta) themeMeta.content = dark ? "#050505" : "#f1efe9";
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(dark));
      themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function applyTheme(next, persist = true) {
    root.dataset.theme = next;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked */ }
    }
    syncThemeUI();
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
  }

  /* Dark-first. The tiny head script has already set data-theme to avoid a flash. */
  applyTheme(isTheme(root.dataset.theme) ? root.dataset.theme : "dark", false);

  themeToggle?.addEventListener("click", (event) => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    const apply = () => applyTheme(next);

    if (document.startViewTransition && !reduceMotion.matches) {
      const transition = document.startViewTransition(apply);
      transition.ready.then(() => {
        const cx = event.clientX || window.innerWidth - 48;
        const cy = event.clientY || 48;
        const radius = Math.hypot(
          Math.max(cx, window.innerWidth - cx),
          Math.max(cy, window.innerHeight - cy)
        );
        root.animate(
          { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`] },
          { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(() => {});
    } else {
      apply();
    }
  });

  /* ---------- scroll progress ---------- */
  const header = document.querySelector(".site-header");
  let ticking = false;
  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    header?.style.setProperty("--scroll", progress.toFixed(4));
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* ---------- active section nav ---------- */
  const navLinks = Array.from(document.querySelectorAll(".nav a[href^='#']"));
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (navSections.length && "IntersectionObserver" in window) {
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      const active = navSections.find((section) => visible.has(section.id));
      navLinks.forEach((link) => {
        if (active && link.getAttribute("href") === `#${active.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    navSections.forEach((section) => observer.observe(section));
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.forEach((other) => other.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "location");
    });
  });

  /* ---------- clipboard ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }

    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  const copyBtn = document.getElementById("copy-email");
  const copyStatus = document.getElementById("copy-status");
  let copyTimer;
  copyBtn?.addEventListener("click", async () => {
    const email = copyBtn.dataset.email || "omsaimithun@gmail.com";
    const ok = await copyText(email);
    if (copyStatus) copyStatus.textContent = ok ? `copied: ${email}` : `copy failed — select ${email}`;
    copyBtn.textContent = ok ? "Copied" : "Try again";
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyBtn.textContent = "Copy";
      if (copyStatus) copyStatus.textContent = "";
    }, 2600);
  });

  /* ---------- clock (IST) ---------- */
  const localTime = document.getElementById("local-time");
  function updateClock() {
    if (!localTime) return;
    const now = new Date();
    localTime.textContent = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(now);
    localTime.dateTime = now.toISOString();
  }
  updateClock();
  setInterval(updateClock, 30000);

  /* ---------- hero typewriter ---------- */
  const typedEl = document.querySelector("[data-typed]");
  if (typedEl) {
    const phrases = [
      "CSE undergrad at MSEC",
      "data science at IIT Madras",
      "FOSS/Linux enthusiast",
      "student developer in Chennai"
    ];
    if (reduceMotion.matches) {
      typedEl.textContent = phrases[0];
    } else {
      let phrase = 0;
      let char = phrases[0].length;
      let deleting = false;
      const tick = () => {
        const text = phrases[phrase];
        typedEl.textContent = text.slice(0, char);
        if (!deleting && char < text.length) {
          char += 1;
          setTimeout(tick, 42);
        } else if (!deleting) {
          deleting = true;
          setTimeout(tick, 1700);
        } else if (char > 0) {
          char -= 1;
          setTimeout(tick, 22);
        } else {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          setTimeout(tick, 260);
        }
      };
      tick();
    }
  }

  /* ---------- hero comet card (native port of Aceternity's component) ---------- */
  const comet = document.querySelector("[data-comet]");
  if (comet) {
    const tilt = comet.querySelector("[data-comet-tilt]");
    const glare = comet.querySelector("[data-comet-glare]");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const canTilt = () => finePointer.matches && !reduceMotion.matches;

    if (tilt && glare && canTilt()) {
      const ROTATE = 8;
      const TRANSLATE = 8;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let active = false;
      let frame = 0;

      const clamp = (value) => Math.max(-0.5, Math.min(0.5, value));
      const paint = () => {
        frame = 0;
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        currentX += dx * 0.18;
        currentY += dy * 0.18;

        if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) {
          currentX = targetX;
          currentY = targetY;
        }

        const scale = active ? 1.025 : 1;
        tilt.style.transform =
          `translate3d(${(currentX * -TRANSLATE).toFixed(2)}px, ${(currentY * TRANSLATE).toFixed(2)}px, 0) ` +
          `rotateX(${(currentY * ROTATE).toFixed(2)}deg) rotateY(${(currentX * -ROTATE).toFixed(2)}deg) ` +
          `scale(${scale})`;
        glare.style.setProperty("--glare-x", `${((currentX + 0.5) * 100).toFixed(2)}%`);
        glare.style.setProperty("--glare-y", `${((currentY + 0.5) * 100).toFixed(2)}%`);

        if (currentX !== targetX || currentY !== targetY) {
          frame = requestAnimationFrame(paint);
        } else if (!active) {
          tilt.style.transform = "";
          glare.style.removeProperty("--glare-x");
          glare.style.removeProperty("--glare-y");
        }
      };

      const start = () => {
        if (!frame) frame = requestAnimationFrame(paint);
      };

      const rest = () => {
        active = false;
        targetX = 0;
        targetY = 0;
        comet.classList.remove("is-active");
        start();
      };

      tilt.addEventListener("pointerenter", () => {
        if (!canTilt()) return;
        active = true;
        comet.classList.add("is-active");
        start();
      });

      tilt.addEventListener("pointermove", (event) => {
        if (!canTilt()) return;
        const rect = tilt.getBoundingClientRect();
        targetX = clamp((event.clientX - rect.left) / rect.width - 0.5);
        targetY = clamp((event.clientY - rect.top) / rect.height - 0.5);
        start();
      });

      tilt.addEventListener("pointerleave", rest);
      tilt.addEventListener("pointercancel", rest);
    }
  }

  /* ---------- blog / talks rendering ---------- */
  const esc = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function renderPosts() {
    const list = document.getElementById("post-list");
    const empty = document.getElementById("post-empty");
    if (!list || !empty) return;

    const posts = Array.isArray(window.POSTS) ? window.POSTS : [];
    if (!posts.length) {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.hidden = false;
    list.innerHTML = posts.map((post, index) => `
      <a class="entry" href="${esc(post.url || "#")}">
        <time datetime="${esc(post.dateTime || post.date || "")}">${esc(post.date || "")}</time>
        <h2>${esc(post.title || "Untitled")}</h2>
        <p>${esc(post.excerpt || "")}</p>
        <span class="entry-more">cat post →</span>
      </a>
    `).join("");
    // add the index separately so empty titles still line up
    list.querySelectorAll(".entry").forEach((entry, index) => {
      const idx = document.createElement("span");
      idx.className = "entry-idx";
      idx.setAttribute("aria-hidden", "true");
      idx.textContent = String(index + 1).padStart(2, "0");
      entry.prepend(idx);
    });
  }

  function renderTalks() {
    const list = document.getElementById("talk-list");
    const empty = document.getElementById("talk-empty");
    if (!list || !empty) return;

    const talks = Array.isArray(window.TALKS) ? window.TALKS : [];
    if (!talks.length) {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.hidden = false;
    list.innerHTML = talks.map((talk, index) => `
      <a class="entry" href="${esc(talk.url || "#")}">
        <time datetime="${esc(talk.dateTime || "")}">${esc(talk.date || "")}</time>
        <h2>${esc(talk.title || "Untitled talk")}</h2>
        <p>${esc(talk.event || "")}${talk.location ? ` · ${esc(talk.location)}` : ""}</p>
        <span class="entry-more">open slides →</span>
      </a>
    `).join("");
    list.querySelectorAll(".entry").forEach((entry, index) => {
      const idx = document.createElement("span");
      idx.className = "entry-idx";
      idx.setAttribute("aria-hidden", "true");
      idx.textContent = String(index + 1).padStart(2, "0");
      entry.prepend(idx);
    });
  }

  renderPosts();
  renderTalks();

  /* ---------- footer terminal ---------- */
  const term = document.getElementById("term");
  const termOut = document.getElementById("term-out");
  const termForm = document.getElementById("term-form");
  const termInput = document.getElementById("term-input");

  if (term && termOut && termForm && termInput) {
    const EMAIL = "omsaimithun@gmail.com";
    const history = [];
    let historyIndex = 0;

    const termPrompt = term.dataset.prompt || "mithun@portfolio:~$";
    const promptHTML = `<span class='term-prompt'>${esc(termPrompt)}</span>`;

    function print(html, className = "term-line") {
      const line = document.createElement("div");
      line.className = className;
      line.innerHTML = html;
      termOut.appendChild(line);
      termOut.scrollTop = termOut.scrollHeight;
    }

    function text(value, className = "term-line term-out-text") {
      print(esc(value), className);
    }

    function echo(command) {
      print(`${promptHTML} <span class="term-cmd">${esc(command)}</span>`);
    }

    function blank() {
      print("&nbsp;", "term-line");
    }

    function help() {
      print("<span class='term-ok'>mithun@portfolio — shell help</span>");
      print("<span class='term-dim'>──────────────────────────────────────────────</span>");
      const rows = [
        ["help", "this page"],
        ["whoami", "one-line identity"],
        ["about", "the short bio"],
        ["projects", "things I have shipped"],
        ["ls", "files in this directory"],
        ["cat FILE", "read a file (try .zshrc)"],
        ["pwd", "print working directory"],
        ["blog", "open the blog"],
        ["talks", "open the talks page"],
        ["theme", "toggle light / dark"],
        ["email", "copy my email address"],
        ["contact", "email, phone, location"],
        ["socials", "where else to find me"],
        ["neofetch", "system + person info"],
        ["date", "current time in IST"],
        ["history", "commands from this session"],
        ["clear", "clear the screen"],
        ["exit", "exit 0"]
      ];
      rows.forEach(([key, value]) => {
        print(
          `<span class="term-help-key">${key.padEnd(15, " ")}</span><span class="term-help-val">${value}</span>`
        );
      });
      print("<span class='term-dim'>tip: ↑ / ↓ walks through history</span>");
    }

    const files = {
      "welcome.txt": [
        "welcome to my portfolio.",
        "AI-assisted, human-reviewed HTML, CSS and JavaScript. no framework.",
        "dark-first, dot-grid, red / white / black, terminal in the footer."
      ],
      "about.txt": [
        "mithun srinivasan - CSE undergrad at MSEC.",
        "foundational-level data science and applications student at IIT Madras.",
        "FOSS/Linux enthusiast building open-source tools in Chennai.",
        "currently: Technical Consultant at Upfinity; FOSS United Chennai.",
        "aiming at a technical career in public service."
      ],
      "projects.txt": [
        "ditch-windows        Go       rebuild a Windows machine from one encrypted backup",
        "srigurugranthsahib   TS       reader for all 1,430 angs, four languages",
        "meeting-transcriber  Python   audio → notes you can scan",
        "spank-for-windows    Go       Windows port of taigrr/spank",
        "sticker-brains       TS       brain teasers unlock meme stickers"
      ],
      "contact.txt": [
        "email     omsaimithun@gmail.com",
        "phone     +91 93420 99436",
        "location  Chennai, India · IST (UTC+05:30)",
        "book      cal.com/mithun-srinivasan/30min"
      ],
      ".zshrc": [
        "export EDITOR=nvim",
        "export PAGER=less",
        "alias ll='ls -la'",
        "alias gs='git status'",
        "alias ..='cd ..'",
        "setopt autocd",
        "# red, white, black. nothing else."
      ]
    };

    function listFiles() {
      text("welcome.txt   about.txt   projects.txt   contact.txt   .zshrc");
      text("blog.html     talks.html");
    }

    function run(raw) {
      const input = raw.trim();
      if (!input) return;

      const [command, ...args] = input.split(/\s+/);
      const cmd = command.toLowerCase();
      const arg = args.join(" ");

      switch (cmd) {
        case "help":
        case "?":
          help();
          break;

        case "whoami":
          text("mithun srinivasan - CSE undergrad at MSEC, FOSS/Linux enthusiast, Chennai.", "term-line term-ok");
          break;

        case "about":
          files["about.txt"].forEach((line) => text(line));
          break;

        case "projects":
          files["projects.txt"].forEach((line) => text(line));
          text("run: blog / talks / contact", "term-line term-dim");
          break;

        case "ls":
          if (arg === "-la") {
            text("drwxr-xr-x  mithun  portfolio");
            text("-rw-r--r--  mithun  welcome.txt");
            text("-rw-r--r--  mithun  about.txt");
            text("-rw-r--r--  mithun  projects.txt");
            text("-rw-r--r--  mithun  contact.txt");
            text("-rw-r--r--  mithun  .zshrc");
            text("-rw-r--r--  mithun  blog.html");
            text("-rw-r--r--  mithun  talks.html");
          } else {
            listFiles();
          }
          break;

        case "cat": {
          if (!arg) {
            text("usage: cat <file>", "term-line term-dim");
            break;
          }
          const file = files[arg.toLowerCase()];
          if (file) file.forEach((line) => text(line));
          else text(`cat: ${arg}: No such file or directory`, "term-line term-dim");
          break;
        }

        case "pwd":
          text("/home/mithun/portfolio");
          break;

        case "cd":
          if (!arg || arg === "~" || arg === ".") {
            text("/home/mithun/portfolio");
          } else if (/^blog(\.html)?$/.test(arg)) {
            text("opening blog.html …", "term-line term-dim");
            window.location.assign("blog.html");
          } else if (/^talks(\.html)?$/.test(arg)) {
            text("opening talks.html …", "term-line term-dim");
            window.location.assign("talks.html");
          } else {
            text(`cd: no such file or directory: ${arg}`, "term-line term-dim");
          }
          break;

        case "blog":
          text("opening blog.html …", "term-line term-dim");
          window.location.assign("blog.html");
          break;

        case "talks":
          text("opening talks.html …", "term-line term-dim");
          window.location.assign("talks.html");
          break;

        case "theme": {
          const next = currentTheme() === "dark" ? "light" : "dark";
          applyTheme(next);
          text(`theme → ${next}`);
          break;
        }

        case "email":
          copyText(EMAIL).then((ok) => {
            text(ok ? `copied: ${EMAIL}` : `email: ${EMAIL}`, ok ? "term-line term-ok" : "term-line term-out-text");
          });
          break;

        case "contact":
          files["contact.txt"].forEach((line) => text(line));
          break;

        case "socials":
          text("github     github.com/mithun-srinivasan");
          text("linkedin   linkedin.com/in/mithun-srinivasan-msec");
          text("x          x.com/simply_mithun");
          text("mastodon   mastodon.social/@mithunsrinivasan");
          text("notion     itsmithun06.notion.site");
          break;

        case "neofetch":
          [
            "   __  __ ____",
            "  |  \\/  / ___|",
            "  | |\\/| \\___ \\",
            "  | |  | |___) |",
            "  |_|  |_|____/",
            "",
            "  mithun@portfolio",
            "  ----------------",
            "  OS        Chennai, India (IST +05:30)",
            "  Shell     zsh + JetBrains Mono",
            "  WM        whatever tiling setup works",
            "  Editor    nvim",
            "  Focus     FOSS · Linux · DevOps",
            "  Status    learning in public"
          ].forEach((line) => text(line, "term-line term-out-text"));
          break;

        case "date":
          text(new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "medium"
          }).format(new Date()) + " IST");
          break;

        case "history":
          if (!history.length) text("no commands yet", "term-line term-dim");
          else history.forEach((item, index) => text(`${String(index + 1).padStart(3, " ")}  ${item}`));
          break;

        case "clear":
          termOut.replaceChildren();
          break;

        case "exit":
          text("exit 0");
          text("logout", "term-line term-dim");
          break;

        case "sudo":
          text("mithun is not in the sudoers file. This incident will be reported.", "term-line term-dim");
          break;

        case "rm":
          text("nice try.", "term-line term-dim");
          break;

        case "echo":
          text(arg);
          break;

        case "uname":
          text("Linux portfolio 6.x-zen #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux");
          break;

        default:
          text(`command not found: ${input}`, "term-line term-dim");
          text("type 'help' for the list of commands.", "term-line term-dim");
      }
    }

    termForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = termInput.value.trim();
      if (!value) return;
      echo(value);
      history.push(value);
      historyIndex = history.length;
      termInput.value = "";
      run(value);
    });

    termInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (historyIndex > 0) {
          historyIndex -= 1;
          termInput.value = history[historyIndex];
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex += 1;
          termInput.value = history[historyIndex];
        } else {
          historyIndex = history.length;
          termInput.value = "";
        }
      } else if (event.key === "l" && event.ctrlKey) {
        event.preventDefault();
        termOut.replaceChildren();
      }
    });

    term.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      if (window.getSelection()?.toString()) return;
      termInput.focus();
    });

    /* Replace the “last login” timestamp without touching the rest of the log. */
    const loginLine = termOut.querySelector("[data-last-login]");
    if (loginLine) {
      const stamp = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date());
      loginLine.textContent = `Last login: ${stamp} IST on ttys001`;
    }
  }
})();
