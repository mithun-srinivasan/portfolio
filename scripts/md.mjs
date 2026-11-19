/* Dependency-free Markdown → HTML.
   Supports headings (##, ###), paragraphs, bold, italic, inline code,
   fenced code blocks, links, images, lists, blockquotes, hr and raw HTML.
   Everything else is escaped. */

export const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/* Scan forward from an opening paren, tracking nesting depth, to find the
   matching closing paren. Returns -1 when unbalanced. */
function scanBalanced(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/* Only these URL schemes are rendered as active links or images.
   Anything else (javascript:, data:, vbscript:, file:, …) renders as plain text. */
function validUrl(href) {
  return /^https?:\/\//i.test(href)
    || /^mailto:/i.test(href)
    || href.startsWith("/")
    || href.startsWith("#");
}

/* Replace ![alt](url) and [label](url) patterns, scanning for balanced
   parentheses so URLs like https://en.wikipedia.org/wiki/Foo_(bar) work.
   Invalid schemes render as plain text. */
function scanInlineLinksAndImages(text) {
  let result = "";
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const imgMatch = rest.match(/^!\[([^\]]*)\]\(/);
    const lnkMatch = rest.match(/^\[([^\]]+)\]\(/);

    if (imgMatch) {
      const openPos = i + imgMatch[0].length - 1;
      const close = scanBalanced(text, openPos);
      if (close === -1) { result += text[i]; i += 1; continue; }
      const inner = text.slice(i + imgMatch[0].length, close);
      const alt = imgMatch[1];

      const m = /^(\S+)(?:\s+&quot;([^&]*)&quot;)?\s*$/.exec(inner);
      if (!m) { result += text[i]; i += 1; continue; }
      const src = m[1];
      const dims = m[2] || "";

      if (!alt.trim()) {
        result += `![${alt}](${src})`;
        i = close + 1;
        continue;
      }
      if (!validUrl(src)) {
        result += `![${alt}](${src})`;
        i = close + 1;
        continue;
      }

      const size = /^(\d+)x(\d+)$/.exec((dims || "").trim());
      const attrs = size ? ` width="${size[1]}" height="${size[2]}"` : "";
      result += `<img src="${src.replace(/"/g, "&quot;")}" alt="${alt}"${attrs} loading="lazy">`;
      i = close + 1;
    } else if (lnkMatch) {
      const openPos = i + lnkMatch[0].length - 1;
      const close = scanBalanced(text, openPos);
      if (close === -1) { result += text[i]; i += 1; continue; }
      const href = text.slice(i + lnkMatch[0].length, close).trim();
      const label = lnkMatch[1];

      if (!validUrl(href)) {
        result += `[${label}](${href})`;
        i = close + 1;
        continue;
      }

      const external = /^https?:\/\//i.test(href);
      result += `<a href="${href.replace(/"/g, "%22")}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
      i = close + 1;
    } else {
      result += text[i];
      i += 1;
    }
  }
  return result;
}

function renderInline(source) {
  const slots = [];
  const stash = (html) => `\u0000${slots.push(html) - 1}\u0000`;
  let text = String(source);

  text = text.replace(/(`+)([\s\S]*?)\1/g, (_, _ticks, code) => stash(`<code>${escapeHtml(code.trim())}</code>`));
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => stash(tag));
  text = escapeHtml(text);

  text = scanInlineLinksAndImages(text);

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => slots[Number(index)]);
}

const BLOCK_START = /^(#{2,3}\s|```|>\s?|[-*]\s|\d+\.\s|-{3,}\s*$)/;

export function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i += 1; continue; }

    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const language = fence[1];
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      const tag = heading[1].length === 2 ? "h2" : "h3";
      out.push(`<${tag}>${renderInline(heading[2])}</${tag}>`);
      i += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) { out.push("<hr>"); i += 1; continue; }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote><p>${quote.map(renderInline).join("<br>")}</p></blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const marker = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items = [];
      while (i < lines.length && marker.test(lines[i])) {
        items.push(renderInline(lines[i].replace(marker, "")));
        i += 1;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
      continue;
    }

    if (/^\s*</.test(line)) {
      const raw = [];
      while (i < lines.length && lines[i].trim()) {
        raw.push(lines[i]);
        i += 1;
      }
      out.push(raw.join("\n"));
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return out.join("\n");
}
