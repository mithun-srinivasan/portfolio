/* ==========================================================================
   mithun@portfolio — shared behaviour
   theme · scroll · copy · clock · hero typewriter · comet card · footer terminal
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const siteRoot = document.querySelector("#term")?.dataset.root || "";
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
      themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function applyTheme(next, persist = true) {
    root.dataset.theme = next;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked */ }
    }
    syncThemeUI();
    if (persist) toast(`theme → ${next}`);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
  }

  /* Dark-first. The tiny head script has already set data-theme to avoid a flash. */
  applyTheme(isTheme(root.dataset.theme) ? root.dataset.theme : "dark", false);

  /* ---------- hero-only dotted glow (exact Aceternity DottedGlowBackground algorithm) ---------- */
  const heroSection = document.querySelector(".hero");
  if (heroSection) {
    const glowCanvas = document.createElement("canvas");
    glowCanvas.className = "hero-dotted-glow";
    glowCanvas.setAttribute("aria-hidden", "true");
    heroSection.prepend(glowCanvas);
    const glowContext = glowCanvas.getContext("2d");
    if (glowContext) {
      const gap = 12;
      const radius = 1.6;
      const speedMin = 0.45;
      const speedMax = 1.6;
      const speedScale = 1.15;
      const opacity = 0.88;

      let width = 0;
      let height = 0;
      let ratio = 1;
      let dots = [];
      let frame = 0;
      let isVisible = true;
      let baseColor = "rgba(255, 255, 255, 0.2)";
      let glowColor = "#e23b49";

      const readColors = () => {
        const dark = currentTheme() === "dark";
        const style = getComputedStyle(root);
        const redText = style.getPropertyValue("--red-text").trim() || "#e23b49";
        baseColor = dark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.25)";
        glowColor = redText;
      };

      const buildDots = () => {
        dots = [];
        const cols = Math.ceil(width / gap) + 2;
        const rows = Math.ceil(height / gap) + 2;
        const min = Math.min(speedMin, speedMax);
        const max = Math.max(speedMin, speedMax);
        const span = Math.max(max - min, 0);

        for (let i = -1; i < cols; i++) {
          for (let j = -1; j < rows; j++) {
            const x = i * gap + (j % 2 === 0 ? 0 : gap * 0.5);
            const y = j * gap;
            const phase = Math.random() * Math.PI * 2;
            const speed = min + Math.random() * span;
            dots.push({ x, y, phase, speed });
          }
        }
      };

      const paint = (now, animate) => {
        glowContext.clearRect(0, 0, width, height);
        glowContext.save();

        const time = (now / 1000) * Math.max(speedScale, 0);
        const bucketCount = 8;
        const alphaMin = 0.22;
        const alphaSpan = 0.58;
        const buckets = Array.from({ length: bucketCount }, () => new Path2D());
        const halo = [];

        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          let a;
          if (!animate) {
            a = alphaMin;
          } else {
            const mod = (time * d.speed + d.phase) % 2;
            const lin = mod < 1 ? mod : 2 - mod;
            const smooth = 0.5 - 0.5 * Math.cos(lin * Math.PI);
            a = alphaMin + alphaSpan * smooth;
          }
          const bucketIdx = Math.min(bucketCount - 1, Math.floor(((a - alphaMin) / alphaSpan) * bucketCount));
          buckets[bucketIdx].arc(d.x, d.y, radius, 0, Math.PI * 2);
          if (a > 0.58) halo.push({ x: d.x, y: d.y, glow: (a - 0.58) / 0.22 });
        }

        // one Path2D fill per alpha bucket
        for (let b = 0; b < bucketCount; b++) {
          const a = alphaMin + (b + 0.5) * (alphaSpan / bucketCount);
          glowContext.globalAlpha = a * opacity;
          glowContext.fillStyle = a > 0.58 ? glowColor : baseColor;
          glowContext.fill(buckets[b]);
        }

        // larger low-alpha halo circle replaces shadowBlur
        glowContext.fillStyle = glowColor;
        for (const h of halo) {
          glowContext.globalAlpha = 0.18 * h.glow * opacity;
          glowContext.beginPath();
          glowContext.arc(h.x, h.y, radius * 3, 0, Math.PI * 2);
          glowContext.fill();
        }

        glowContext.restore();
      };

      const draw = (now) => {
        frame = 0;
        if (document.hidden || !isVisible) return;
        paint(now, !reduceMotion.matches);
        if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
      };

      const start = () => {
        if (reduceMotion.matches) paint(0, false);
        else if (!document.hidden && isVisible && !frame) frame = requestAnimationFrame(draw);
      };

      const resize = () => {
        const rect = heroSection.getBoundingClientRect();
        ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        width = Math.ceil(rect.width);
        height = Math.ceil(rect.height);
        glowCanvas.width = Math.ceil(width * ratio);
        glowCanvas.height = Math.ceil(height * ratio);
        glowContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        buildDots();
        start();
      };

      readColors();
      resize();

      const heroObserver = new IntersectionObserver((entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) start();
      }, { threshold: 0.05 });
      heroObserver.observe(heroSection);

      window.addEventListener("resize", resize, { passive: true });
      document.addEventListener("visibilitychange", start);
      document.addEventListener("themechange", () => { readColors(); start(); });
      reduceMotion.addEventListener?.("change", start);
    }
  }
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
    toast(ok ? `copied: ${email}` : `copy failed — select ${email}`);
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
      let timer;
      const schedule = (delay) => {
        clearTimeout(timer);
        if (!document.hidden) timer = setTimeout(tick, delay);
      };
      const tick = () => {
        if (document.hidden) return;
        const text = phrases[phrase];
        typedEl.textContent = text.slice(0, char);
        if (!deleting && char < text.length) {
          char += 1;
          schedule(28);
        } else if (!deleting) {
          deleting = true;
          schedule(1200);
        } else if (char > 0) {
          char -= 1;
          schedule(14);
        } else {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          schedule(180);
        }
      };
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) clearTimeout(timer);
        else tick();
      });
      tick();
    }
  }

  /* ---------- hero comet card (silky smooth, responsive 3D tilt & glare) ---------- */
  const comet = document.querySelector("[data-comet]");
  if (comet) {
    const tilt = comet.querySelector("[data-comet-tilt]");
    const glare = comet.querySelector("[data-comet-glare]");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const canTilt = () => finePointer.matches && !reduceMotion.matches;

    if (tilt && glare && canTilt()) {
      const ROTATE = 14;
      const TRANSLATE = 12;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let targetScale = 1;
      let currentScale = 1;
      let active = false;
      let frame = 0;

      const clamp = (value) => Math.max(-0.5, Math.min(0.5, value));
      const paint = () => {
        frame = 0;
        // Smooth dampening factor (0.1) for high-fidelity fluid motion
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const ds = targetScale - currentScale;

        currentX += dx * 0.12;
        currentY += dy * 0.12;
        currentScale += ds * 0.12;

        if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001 && Math.abs(ds) < 0.0001) {
          currentX = targetX;
          currentY = targetY;
          currentScale = targetScale;
        }

        const rotX = (currentY * -ROTATE).toFixed(3);
        const rotY = (currentX * ROTATE).toFixed(3);
        const transX = (currentX * TRANSLATE).toFixed(2);
        const transY = (currentY * TRANSLATE).toFixed(2);

        tilt.style.transform =
          `translate3d(${transX}px, ${transY}px, 0) ` +
          `rotateX(${rotX}deg) rotateY(${rotY}deg) ` +
          `scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, 1)`;

        const gx = ((currentX + 0.5) * 100).toFixed(2);
        const gy = ((currentY + 0.5) * 100).toFixed(2);
        glare.style.setProperty("--glare-x", `${gx}%`);
        glare.style.setProperty("--glare-y", `${gy}%`);

        if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001 || Math.abs(ds) > 0.0001 || active) {
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
        targetScale = 1;
        comet.classList.remove("is-active");
        start();
      };

      tilt.addEventListener("pointerenter", () => {
        if (!canTilt()) return;
        active = true;
        targetScale = 1.04;
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


  /* ---------- toast (sonner-style, native) ---------- */
  let toastTimer;
  function toast(message) {
    let host = document.getElementById("toast");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast";
      host.className = "toast";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    host.textContent = message;
    host.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => host.classList.remove("is-on"), 2200);
  }

  /* ---------- back to top ---------- */
  const toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.textContent = "↑";
  toTop.hidden = true;
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" }));
  document.body.appendChild(toTop);
  window.addEventListener("scroll", () => { toTop.hidden = window.scrollY < 700; }, { passive: true });

  /* ---------- scroll reveal ---------- */
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(".section-head, .project, .timeline li, .skill, .about-grid > *, .coding, .workshop");
    root.classList.add("js-reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    targets.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------- project filter chips ---------- */
  const chipBar = document.getElementById("project-filter");
  if (chipBar) {
    chipBar.hidden = false;
    const chips = Array.from(chipBar.querySelectorAll("[data-filter]"));
    const projects = Array.from(document.querySelectorAll(".work-list .project"));
    const selectChip = (chip, moveFocus = false) => {
      if (!chip) return;
      chips.forEach((item) => {
        const selected = item === chip;
        item.setAttribute("aria-checked", String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      const wanted = chip.dataset.filter;
      projects.forEach((project) => {
        project.hidden = !(wanted === "all" || (project.dataset.lang || "").split(" ").includes(wanted));
      });
      if (moveFocus) chip.focus();
    };

    chipBar.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter]");
      if (chip) selectChip(chip);
    });

    chipBar.addEventListener("keydown", (event) => {
      const current = event.target.closest("[data-filter]");
      if (!current) return;
      const index = chips.indexOf(current);
      let next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = chips[(index + 1) % chips.length];
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = chips[(index - 1 + chips.length) % chips.length];
      else if (event.key === "Home") next = chips[0];
      else if (event.key === "End") next = chips[chips.length - 1];
      if (!next) return;
      event.preventDefault();
      selectChip(next, true);
    });
  }

  /* ---------- project spotlight (red only, fine pointers) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".work-list .project").forEach((project) => {
      project.addEventListener("pointermove", (event) => {
        const rect = project.getBoundingClientRect();
        project.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        project.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      });
      project.addEventListener("pointerleave", () => {
        project.style.removeProperty("--spot-x");
        project.style.removeProperty("--spot-y");
      });
    });
  }

  /* ---------- blog link only when there is a post ---------- */
  const hasPosts = Array.isArray(window.POSTS) && window.POSTS.length > 0;
  document.querySelectorAll("[data-blog-link]").forEach((link) => { link.hidden = !hasPosts; });

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (reduceMotion.matches) { el.textContent = String(target); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 900);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- github pulse: snapshot json -> numbers + heatmap ---------- */
  const heat = document.getElementById("heat");
  const heatWrap = document.getElementById("heat-wrap");
  const heatFallback = document.getElementById("heat-fallback");
  const statEls = document.querySelectorAll(".stats [data-count]");
  const startStats = () => {
    if (!statEls.length) return;
    if ("IntersectionObserver" in window) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { countUp(entry.target); io2.unobserve(entry.target); } });
      }, { threshold: 0.6 });
      statEls.forEach((el) => io2.observe(el));
    } else {
      statEls.forEach(countUp);
    }
  };
  if (heat && window.location.protocol !== "file:") {
    fetch(`${siteRoot}assets/data/github.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const set = (index, value) => { if (statEls[index] && Number.isFinite(value)) statEls[index].dataset.count = String(value); };
        set(0, data.repos);
        set(1, data.contributions);
        const days = data.days || [];
        if (days.length) {
          if (heatFallback) heatFallback.hidden = true;
          const pad = new Date(`${days[0][0]}T00:00:00`).getDay();
          const frag = document.createDocumentFragment();
          for (let i = 0; i < pad; i += 1) { const p = document.createElement("i"); p.className = "pad"; frag.appendChild(p); }
          days.forEach(([date, level, count]) => {
            const cell = document.createElement("i");
            cell.dataset.l = String(level);
            cell.title = `${count} contribution${count === 1 ? "" : "s"} on ${date}`;
            frag.appendChild(cell);
          });
          heat.replaceChildren(frag);
          heat.setAttribute("aria-label", `GitHub contributions over the last 12 months: ${data.contributions} in total`);
          heatWrap.hidden = false;
          heatWrap.scrollLeft = heatWrap.scrollWidth;
        } else if (heatFallback) {
          heatFallback.hidden = false;
        }
      })
      .catch(() => {
        if (heatFallback) heatFallback.hidden = false;
      })
      .finally(startStats);
  } else {
    startStats();
  }

  /* ---------- text scramble on heading hover (once per hover) ---------- */
  if (!reduceMotion.matches && window.matchMedia("(hover: hover)").matches) {
    const GLYPHS = "!<>-_\\/[]{}=+*^?#";
    document.querySelectorAll(".section-head h2, .page-head h1").forEach((heading) => {
      const nodes = [];
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) { if (walker.currentNode.nodeValue.trim()) nodes.push([walker.currentNode, walker.currentNode.nodeValue]); }
      if (!nodes.length) return;
      heading.setAttribute("aria-label", heading.textContent.replace(/\s+/g, " ").trim());
      let running = false;
      heading.addEventListener("pointerenter", () => {
        if (running) return;
        running = true;
        const frames = 14;
        let frame = 0;
        const tick = () => {
          frame += 1;
          nodes.forEach(([node, original]) => {
            node.nodeValue = original.split("").map((ch, i) => (ch === " " || ch === "\n" || i < (frame / frames) * original.length)
              ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");
          });
          if (frame < frames) setTimeout(tick, 32);
          else { nodes.forEach(([node, original]) => { node.nodeValue = original; }); running = false; }
        };
        tick();
      });
    });
  }

  /* ---------- command palette (Ctrl/Cmd+K or /) ---------- */
  const onHome = !!document.getElementById("work");
  const home = (hash) => (onHome ? hash : `${siteRoot}index.html${hash}`);
  const PROJECTS = [
    ["ditch-windows", "https://github.com/mithun-srinivasan/ditch-windows"],
    ["srigurugranthsahib", "https://srigurugranthsahib.vercel.app/"],
    ["meeting-transcriber-and-summarizer", "https://github.com/mithun-srinivasan/meeting-transcriber-and-summarizer"],
    ["spank-for-windows", "https://github.com/mithun-srinivasan/spank-for-windows"],
    ["sticker-brains", "https://github.com/mithun-srinivasan/sticker-brains"]
  ];
  const paletteItems = [
    ...[["work", "#work"], ["about", "#about"], ["experience", "#experience"], ["skills", "#skills"], ["contact", "#contact"]]
      .map(([name, hash]) => ({ group: "go to", label: name, run: () => { window.location.assign(home(hash)); } })),
    ...(hasPosts ? [{ group: "go to", label: "blog", run: () => window.location.assign(`${siteRoot}blog.html`) }] : []),
    { group: "go to", label: "talks", run: () => window.location.assign(`${siteRoot}talks.html`) },
    ...PROJECTS.map(([name, url]) => ({ group: "projects", label: name, run: () => window.open(url, "_blank", "noopener") })),
    { group: "actions", label: "toggle theme", run: () => applyTheme(currentTheme() === "dark" ? "light" : "dark") },
    { group: "actions", label: "copy email", run: async () => { const ok = await copyText("omsaimithun@gmail.com"); toast(ok ? "copied: omsaimithun@gmail.com" : "email: omsaimithun@gmail.com"); } },
    { group: "actions", label: "book 30 minutes", run: () => window.open("https://cal.com/mithun-srinivasan/30min", "_blank", "noopener") },
    ...[["github", "https://github.com/mithun-srinivasan"], ["linkedin", "https://www.linkedin.com/in/mithun-srinivasan-msec"], ["x", "https://x.com/simply_mithun"], ["instagram", "https://www.instagram.com/its_mithunsrinivasan/"], ["mastodon", "https://mastodon.social/@mithunsrinivasan"], ["notion", "https://itsmithun06.notion.site/"]]
      .map(([name, url]) => ({ group: "elsewhere", label: name, run: () => window.open(url, "_blank", "noopener") }))
  ];

  const fuzzy = (query, text) => {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t.includes(q)) return 100 - t.indexOf(q);
    let i = 0;
    for (const ch of t) { if (ch === q[i]) i += 1; if (i === q.length) return 1; }
    return 0;
  };

  if (typeof HTMLDialogElement === "function") {
    const dialog = document.createElement("dialog");
    dialog.className = "palette";
    dialog.setAttribute("aria-label", "Command palette");
    dialog.innerHTML = `
      <div class="palette-box">
        <label class="sr-only" for="palette-input">Search commands</label>
        <div class="palette-field"><span aria-hidden="true">$</span>
          <input id="palette-input" type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="jump to… (esc to close)">
        </div>
        <ul id="palette-list" role="listbox" aria-label="Results"></ul>
        <p class="palette-hint">↑ ↓ to move · enter to run · esc to close</p>
      </div>`;
    document.body.appendChild(dialog);
    const input = dialog.querySelector("#palette-input");
    const list = dialog.querySelector("#palette-list");
    let results = [];
    let active = 0;

    const paint = () => {
      results = paletteItems
        .filter((item) => !item.when || item.when())
        .map((item) => ({ item, score: fuzzy(input.value.trim(), `${item.label} ${item.group}`) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.item);
      active = Math.min(active, Math.max(0, results.length - 1));
      list.replaceChildren(...results.map((item, index) => {
        const li = document.createElement("li");
        li.id = `palette-opt-${index}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(index === active));
        const group = document.createElement("span");
        group.textContent = item.group;
        li.append(item.label, group);
        li.addEventListener("click", () => run(item));
        return li;
      }));
      if (!results.length) {
        const li = document.createElement("li");
        li.className = "palette-empty";
        li.textContent = "no match";
        list.appendChild(li);
      }
      input.setAttribute("aria-activedescendant", results.length ? `palette-opt-${active}` : "");
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    };

    const run = (item) => { dialog.close(); item.run(); };
    const openPalette = () => { if (dialog.open) return; input.value = ""; active = 0; paint(); dialog.showModal(); input.focus(); };

    input.addEventListener("input", () => { active = 0; paint(); });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); active = Math.min(results.length - 1, active + 1); paint(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); active = Math.max(0, active - 1); paint(); }
      else if (event.key === "Enter") { event.preventDefault(); if (results[active]) run(results[active]); }
    });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

    const isApple = /macintosh|mac intel|mac ppc|mac68k/.test((navigator.userAgentData?.platform || navigator.platform || "").toLowerCase());
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "palette-trigger";
    trigger.setAttribute("aria-label", "Open command palette");
    trigger.innerHTML = `<span aria-hidden="true">${isApple ? "cmd k" : "ctrl k"}</span>`;
    trigger.addEventListener("click", openPalette);
    themeToggle?.before(trigger);

    document.addEventListener("keydown", (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.activeElement?.isContentEditable;
      if ((event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) || (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        if (dialog.open) dialog.close();
        else openPalette();
      }
    });
  }

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

    const LINKS = /(https?:\/\/[^\s<]+|\b(?:github\.com|linkedin\.com|x\.com|instagram\.com|mastodon\.social|itsmithun06\.notion\.site|cal\.com)\/[^\s<]*)/g;
    function linkify(html) {
      return html.replace(LINKS, (url) => {
        const href = /^https?:/.test(url) ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" rel="noopener">${url}</a>`;
      });
    }

    function text(value, className = "term-line term-out-text") {
      print(linkify(esc(value)), className);
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
        ["help / ?", "this page"],
        ["whoami", "one-line identity"],
        ["about", "the short bio"],
        ["projects", "things I have shipped"],
        ["ls", "files in this directory"],
        ["cat FILE", "read a file (try .zshrc)"],
        ["pwd", "print working directory"],
        ["cd [blog|talks]", "move to a page"],
        ["blog", "open the blog"],
        ["talks", "open the talks page"],
        ["theme [dark|light]", "toggle or set the theme"],
        ["open PROJECT", "open a project (try: open ditch)"],
        ["skills", "languages and tools"],
        ["experience", "the short log"],
        ["email", "copy my email address"],
        ["contact", "email, phone, location"],
        ["socials", "where else to find me"],
        ["neofetch", "system + person info"],
        ["date", "current time in IST"],
        ["history", "commands from this session"],
        ["clear", "clear the screen"],
        ["echo TEXT", "print text"],
        ["uname", "kernel-ish output"],
        ["sudo", "permission denied, politely"],
        ["rm", "nice try"],
        ["exit", "exit 0"]
      ];
      rows.forEach(([key, value]) => {
        print(
          `<span class="term-help-key">${key.padEnd(19, " ")}</span><span class="term-help-val">${value}</span>`
        );
      });
      print("<span class='term-dim'>tip: ↑ / ↓ history · tab completes · ctrl+c clears input</span>");
    }

    const files = {
      "welcome.txt": [
        "welcome to my portfolio.",
        "AI-assisted, human-reviewed HTML, CSS and JavaScript. no framework.",
        "dark-first, dot-grid, red / white / black, terminal in the footer."
      ],
      "about.txt": [
        "Sophomore CSE Undergraduate - MSEC | BS Data Science & Applications (Foundational Level) - IITM | FOSS/Linux Enthusiast | Student Developer",
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

    const COMMANDS = ["help", "?", "whoami", "about", "projects", "ls", "cat", "pwd", "cd", "blog", "talks", "theme", "open", "skills", "experience", "email", "contact", "socials", "neofetch", "date", "history", "clear", "exit", "echo", "uname", "sudo", "rm"];

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
          text("Sophomore CSE Undergraduate - MSEC | BS Data Science & Applications (Foundational Level) - IITM | FOSS/Linux Enthusiast | Student Developer", "term-line term-ok");
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
            window.location.assign(`${siteRoot}blog.html`);
          } else if (/^talks(\.html)?$/.test(arg)) {
            text("opening talks.html …", "term-line term-dim");
            window.location.assign(`${siteRoot}talks.html`);
          } else {
            text(`cd: no such file or directory: ${arg}`, "term-line term-dim");
          }
          break;

        case "blog":
          text("opening blog.html …", "term-line term-dim");
          window.location.assign(`${siteRoot}blog.html`);
          break;

        case "talks":
          text("opening talks.html …", "term-line term-dim");
          window.location.assign(`${siteRoot}talks.html`);
          break;

        case "theme": {
          const wanted = arg.toLowerCase();
          if (wanted && !isTheme(wanted)) { text("usage: theme [dark|light]", "term-line term-dim"); break; }
          const next = wanted || (currentTheme() === "dark" ? "light" : "dark");
          applyTheme(next);
          text(`theme → ${next}`);
          break;
        }

        case "open": {
          if (!arg) { text("usage: open PROJECT   (try: open ditch)", "term-line term-dim"); break; }
          const hit = PROJECTS.find(([name]) => name.startsWith(arg.toLowerCase()) || name.includes(arg.toLowerCase()));
          if (!hit) { text(`open: no project matches ${arg}`, "term-line term-dim"); break; }
          text(`opening ${hit[1]} …`, "term-line term-dim");
          window.open(hit[1], "_blank", "noopener");
          break;
        }

        case "skills":
          text("languages  C, C++, Python, Java, MATLAB");
          text("tools      Git, GitHub, Linux, Notion");
          text("speaks     Tamil, English, Hindi, Japanese, Sanskrit");
          break;

        case "experience":
          text("2026-now   Technical Consultant, Upfinity");
          text("2026-now   Contributor, FOSS United Chennai");
          text("2026-now   Contributor + volunteer, Sapiens Campus");
          text("2026-now   Community volunteer, fromDevtoOps");
          text("oct 2026   Volunteer, GDG Chennai DevFest 2026");
          text("2026       GSSoC contributor, Campus Mantri @ GfG");
          break;

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
          text("instagram  instagram.com/its_mithunsrinivasan");
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
      } else if (event.key === "c" && event.ctrlKey && !window.getSelection()?.toString()) {
        event.preventDefault();
        echo(`${termInput.value}^C`);
        termInput.value = "";
      } else if (event.key === "Tab") {
        const value = termInput.value;
        if (!value.trim()) return;
        event.preventDefault();
        const parts = value.split(/\s+/);
        const last = parts[parts.length - 1].toLowerCase();
        const pool = parts.length === 1
          ? COMMANDS
          : parts[0].toLowerCase() === "cat" ? Object.keys(files)
          : parts[0].toLowerCase() === "open" ? PROJECTS.map(([name]) => name)
          : parts[0].toLowerCase() === "theme" ? ["dark", "light"] : [];
        const matches = pool.filter((name) => name.toLowerCase().startsWith(last));
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0];
          termInput.value = parts.join(" ") + (parts.length === 1 ? " " : "");
        } else if (matches.length > 1) {
          text(matches.join("   "), "term-line term-dim");
          let prefix = matches[0];
          matches.forEach((m) => { while (!m.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1); });
          parts[parts.length - 1] = prefix;
          termInput.value = parts.join(" ");
        }
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
