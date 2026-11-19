#!/usr/bin/env node
/* Static checks for mithunsrinivasan.is-a.dev. No dependencies.
   Run after `node scripts/build.mjs`. Exits non-zero on any failure. */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (message) => failures.push(message);
/* Normalise CRLF to LF so checks and hashes match on Windows and Linux. */
const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");

function relExists(urlPath) {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (!clean || clean === "/") return fs.existsSync(path.join(ROOT, "index.html"));
  const target = clean.startsWith("/") ? path.join(ROOT, clean.slice(1)) : clean;
  const file = path.resolve(ROOT, target);
  if (!file.startsWith(ROOT)) return false;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return true;
  return fs.existsSync(`${file}.html`) || fs.existsSync(path.join(file, "index.html"));
}

/* ---------- 1. scripts parse ---------- */

for (const file of ["assets/js/script.js", "assets/js/posts.js"]) {
  const source = read(path.join(ROOT, file));
  try {
    new vm.Script(source, { filename: file });
  } catch (error) {
    fail(`${file}: ${error.message}`);
  }
}

/* ---------- collect pages ---------- */

const pages = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith(".html"))
  .map((name) => path.join(ROOT, name));
const postsDir = path.join(ROOT, "posts");
if (fs.existsSync(postsDir)) {
  pages.push(...fs.readdirSync(postsDir).filter((name) => name.endsWith(".html")).map((name) => path.join(postsDir, name)));
}

const titles = new Map();

for (const file of pages) {
  const source = read(file);
  const name = rel(file);

  /* exactly one h1 */
  const h1 = source.match(/<h1[\s>]/gi) || [];
  if (h1.length !== 1) fail(`${name}: expected exactly one <h1>, found ${h1.length}`);

  /* unique title */
  const title = /<title>([\s\S]*?)<\/title>/.exec(source);
  if (!title) fail(`${name}: missing <title>`);
  else {
    const text = title[1].trim();
    if (text.length > 60) fail(`${name}: title is ${text.length} characters (max 60)`);
    if (titles.has(text)) fail(`${name}: duplicate title "${text}" (also ${titles.get(text)})`);
    else titles.set(text, name);
  }

  /* canonical everywhere except 404 */
  if (!name.endsWith("404.html") && !/rel="canonical"/.test(source)) fail(`${name}: missing canonical link`);

  /* JSON-LD parses */
  const blocks = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    try {
      JSON.parse(json);
    } catch (error) {
      fail(`${name}: JSON-LD does not parse (${error.message})`);
    }
  }
  if (!blocks.length && !name.endsWith("posts/_template.html")) fail(`${name}: no JSON-LD block`);

  /* no leftover TODO markers in rendered pages */
  if (/\bTODO\b/.test(source)) fail(`${name}: contains a TODO marker`);

  /* duplicate ids */
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`${name}: duplicate id "${id}"`);
    seen.add(id);
  }

  /* local references resolve */
  const refs = [...source.matchAll(/(?:href|src|imagesrcset|srcset)="([^"]*)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^javascript:/i.test(ref)) fail(`${name}: javascript: URL found: ${ref}`);
    if (!ref || /^(https?:|mailto:|tel:|data:|\/\/)/i.test(ref)) continue;
    if (ref.startsWith("#")) continue;
    const candidates = ref.split(",").map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);
    for (const candidate of candidates) {
      if (candidate.startsWith("#") || candidate.startsWith("mailto:")) continue;
      if (!relExists(candidate)) fail(`${name}: broken local reference "${candidate}"`);
    }
  }

  /* disclosure stays on every page */
  if (!name.endsWith("posts/_template.html") && !/built with AI assistance/i.test(source)) {
    fail(`${name}: missing the AI-assistance disclosure`);
  }
  if (!name.endsWith("posts/_template.html")) {
    const icons = ["/favicon.ico", "/assets/images/site-icon.svg", "/assets/icons/icon-192.png"];
    for (const icon of icons) {
      if (!source.includes(`href="${icon}"`)) fail(`${name}: missing favicon ${icon}`);
    }
  }
}

/* ---------- XML well-formedness ---------- */

function checkXml(file, label) {
  const source = read(path.join(ROOT, file)).replace(/<\?xml[^>]*\?>/, "").replace(/<!--[\s\S]*?-->/g, "");
  const stack = [];
  let roots = 0;
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>/g;
  let match;
  while ((match = tagRe.exec(source))) {
    const [, closing, tag, , selfClosing] = match;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== tag) fail(`${label}: mismatched closing tag </${tag}>`);
    } else {
      if (!stack.length) roots += 1;
      stack.push(tag);
    }
  }
  if (stack.length) fail(`${label}: unclosed <${stack[stack.length - 1]}>`);
  if (roots !== 1) fail(`${label}: expected one root element, found ${roots}`);
}

checkXml("sitemap.xml", "sitemap.xml");
checkXml("feed.xml", "feed.xml");

/* ---------- sitemap + feed contents ---------- */

const sitemap = read(path.join(ROOT, "sitemap.xml"));
const feed = read(path.join(ROOT, "feed.xml"));
const sourceDir = path.join(ROOT, "content", "posts");
const sources = fs.existsSync(sourceDir)
  ? fs.readdirSync(sourceDir).filter((name) => name.endsWith(".md") && !name.startsWith("_"))
  : [];

for (const name of sources) {
  const file = path.join(sourceDir, name);
  const body = read(file);

  /* duplicate frontmatter key check */
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body);
  if (fmMatch) {
    const keys = [];
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const split = line.indexOf(":");
      if (split < 0) continue;
      const key = line.slice(0, split).trim();
      if (keys.includes(key)) fail(`${name}: duplicated frontmatter key "${key}"`);
      keys.push(key);
    }
  }

  if (/^draft:\s*true\s*$/im.test(body)) continue;
  const slug = (/^slug:\s*(.+)$/im.exec(body)?.[1] || name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "")).trim();
  if (!sitemap.includes(`/posts/${slug}.html`)) fail(`sitemap.xml: missing /posts/${slug}.html`);
  if (!feed.includes(`/posts/${slug}.html`)) fail(`feed.xml: missing /posts/${slug}.html`);
  const postsJs = read(path.join(ROOT, "assets/js/posts.js"));
  if (!postsJs.includes(`/posts/${slug}.html`)) fail(`assets/js/posts.js: missing /posts/${slug}.html`);
  if (!fs.existsSync(path.join(postsDir, `${slug}.html`))) fail(`posts/${slug}.html: not built`);
}

/* duplicate slug check across all post sources */
const slugs = new Map();
for (const name of sources) {
  const file = path.join(sourceDir, name);
  const body = read(file);
  const slug = (/^slug:\s*(.+)$/im.exec(body)?.[1] || name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "")).trim();
  if (slugs.has(slug)) fail(`duplicate slug "${slug}" (${name} and ${slugs.get(slug)})`);
  slugs.set(slug, name);
}

/* ---------- generated output is up to date ---------- */

function generatedFiles() {
  const files = ["404.html", "blog.html", "feed.xml", "index.html", "sitemap.xml", "talks.html", "assets/js/posts.js"];
  if (fs.existsSync(postsDir)) {
    files.push(...fs.readdirSync(postsDir).filter((name) => name.endsWith(".html")).map((name) => `posts/${name}`));
  }
  return files.map((name) => path.join(ROOT, name)).filter((file) => fs.existsSync(file));
}

const runBuild = () => execFileSync(process.execPath, [path.join(ROOT, "scripts", "build.mjs")], { cwd: ROOT, stdio: "ignore" });
const snapshot = () => new Map(generatedFiles().map((file) => [rel(file), read(file)]));

try {
  runBuild();
  const first = snapshot();
  runBuild();
  const second = snapshot();
  for (const [file, content] of first) {
    if (second.get(file) !== content) fail(`${file}: changed on a second build (build is not idempotent)`);
  }
  for (const file of second.keys()) {
    if (!first.has(file)) fail(`${file}: appeared on a second build (build is not idempotent)`);
  }
} catch (error) {
  fail(`build failed while checking for stale output: ${error.message}`);
}

/* ---------- report ---------- */

if (failures.length) {
  console.error(`check: ${failures.length} problem(s)`);
  failures.forEach((message) => console.error(`  ✗ ${message}`));
  process.exit(1);
}
console.log(`check: ${pages.length} page(s), ${sources.length} post source(s) — all clear`);
