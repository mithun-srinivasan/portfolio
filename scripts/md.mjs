/* Dependency-free Markdown → HTML.
   Supports headings (##, ###), paragraphs, bold, italic, inline code,
   fenced code blocks, links, images, lists (incl. 2-space nested), blockquotes,
   hr, pipe tables, hard breaks (trailing two spaces) and raw HTML.
   Everything else is escaped. Existing HTML entities (&amp;) are preserved. */

export const escapeHtml = (value) => String(value)
  /* Only escape & that is not already part of an HTML entity. */
  .replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function warn(message) {
  console.warn(`warning: ${message}`);
}

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

/* Detect a list item line with optional leading whitespace (for nesting). */
const LIST_ITEM = /^(\s*)([-*]\s+|\d+\.\s+)/;

/* Render a table from pipe-delimited lines starting at index i.
   Returns { html, nextIndex } or null if not a table. */
function renderTable(lines, i) {
  const first = lines[i];
  if (!/^\s*\|/.test(first) || !/\|/.test(first.slice(1))) return null;

  const headerCells = first.split("|").map((c) => c.trim()).filter(Boolean);
  if (headerCells.length === 0) return null;

  let j = i + 1;
  // Separator row: | --- | --- |
  if (j >= lines.length || !/^\s*\|[\s\-|:]+\|\s*$/.test(lines[j])) return null;
  j += 1;

  const rows = [];
  while (j < lines.length && /^\s*\|/.test(lines[j])) {
    const cells = lines[j].split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length > 0) rows.push(cells);
    j += 1;
  }

  const thead = `<tr>${headerCells.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr>`;
  const tbody = rows.map((row) => `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("");
  return {
    html: `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    nextIndex: j,
  };
}

/* Render a nested list block starting at index i.
   Supports 2-space indentation for nesting.
   Returns { html, nextIndex }. */
function renderList(lines, i) {
  /* Collect all consecutive list items with indent and ordered flag. */
  const flat = [];
  let j = i;
  while (j < lines.length) {
    const line = lines[j];
    if (!line.trim()) break;
    const m = LIST_ITEM.exec(line);
    if (!m) break;
    flat.push({
      indent: m[1].length,
      ordered: /^\d+\.\s+/.test(m[2]),
      content: line.slice(m[0].length),
    });
    j += 1;
  }

  /* Convert flat list to a tree using an indent stack.
     Each node: { ordered, content, children: [] } */
  const roots = [];
  const stack = []; // { indent, node }
  for (const item of flat) {
    while (stack.length > 0 && stack[stack.length - 1].indent >= item.indent) {
      stack.pop();
    }
    const node = { ordered: item.ordered, content: item.content, children: [] };
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ indent: item.indent, node });
  }

  /* Render a single list item node (li + optional nested sublist). */
  function renderItem(node) {
    const childTag = node.ordered ? "ol" : "ul";
    const childrenHtml = node.children.length
      ? `<${childTag}>${node.children.map(renderItem).join("")}</${childTag}>`
      : "";
    return `<li>${renderInline(node.content)}${childrenHtml}</li>`;
  }

  /* All root items are siblings in one list. Use the first item's ordered flag. */
  const rootTag = roots.length ? (roots[0].ordered ? "ol" : "ul") : "ul";
  const html = `<${rootTag}>${roots.map(renderItem).join("")}</${rootTag}>`;

  return { html, nextIndex: j };
}

export function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i += 1; continue; }

    /* Warn on H1: use ## instead */
    if (/^#\s/.test(line) && !/^#{2,}\s/.test(line)) {
      warn("markdown: '# ' H1 found — use ## for headings instead");
    }

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

    const table = renderTable(lines, i);
    if (table) { out.push(table.html); i = table.nextIndex; continue; }

    const listMatch = LIST_ITEM.exec(line);
    if (listMatch) {
      const list = renderList(lines, i);
      out.push(list.html);
      i = list.nextIndex;
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
    const BR = "\uE000"; // private-use placeholder for hard breaks
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]) && !LIST_ITEM.test(lines[i])) {
      const hardBreak = /  $/.test(lines[i]);
      paragraph.push(hardBreak ? lines[i].replace(/  $/, "") + BR : lines[i]);
      i += 1;
    }
    out.push(`<p>${renderInline(paragraph.join(" ")).replace(BR, "<br>")}</p>`);
  }

  return out.join("\n");
}
