/* Dependency-free Markdown → HTML.
   Supports headings (##, ###), paragraphs, bold, italic, inline code,
   fenced code blocks, links, images, lists, blockquotes, hr and raw HTML.
   Everything else is escaped. */

export const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function renderInline(source) {
  const slots = [];
  const stash = (html) => `\u0000${slots.push(html) - 1}\u0000`;
  let text = String(source);

  text = text.replace(/(`+)([\s\S]*?)\1/g, (_, _ticks, code) => stash(`<code>${escapeHtml(code.trim())}</code>`));
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => stash(tag));
  text = escapeHtml(text);

  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, dims) => {
    if (!alt.trim()) throw new Error(`Markdown image needs alt text: ${src}`);
    const size = /^(\d+)x(\d+)$/.exec((dims || "").trim());
    const attrs = size ? ` width="${size[1]}" height="${size[2]}"` : "";
    return `<img src="${src.replace(/"/g, "&quot;")}" alt="${alt}"${attrs} loading="lazy">`;
  });

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//i.test(href);
    return `<a href="${href.replace(/"/g, "%22")}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
  });

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
