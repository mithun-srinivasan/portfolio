#!/usr/bin/env node
/* Local studio for content/.
   node scripts/studio.mjs  →  http://127.0.0.1:4321/?token=…
   The Studio only works at http://127.0.0.1:4321 (loopback only).

   Node's http module only. Loopback only, token on every API call,
   Origin/Host checks, fixed child processes, writes confined to
   content/ and assets/images/posts/. */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  renderPostPage,
  renderMarkdown,
  loadPosts,
  parseFrontMatter,
  readingTime,
  formatDate,
  SITE,
} from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content");
const POSTS = path.join(CONTENT, "posts");
const TRASH = path.join(CONTENT, ".trash");
const IMAGES = path.join(ROOT, "assets", "images", "posts");
const TALKS = path.join(CONTENT, "talks.json");
const STUDIO_HTML = path.join(ROOT, "scripts", "studio", "index.html");

const HOST = "127.0.0.1";
const PORT = Number(process.env.STUDIO_PORT || 4321);
const TOKEN = crypto.randomBytes(24).toString("hex");
const MAX_UPLOAD = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const slugify = (value) => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60);

const localDate = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/* ---------- paths ---------- */

/* Every write goes through here: no traversal, no absolute paths,
   no escaping content/ or assets/images/posts/. */
function safeFile(base, ...parts) {
  const file = path.resolve(base, ...parts);
  const root = path.resolve(base) + path.sep;
  if (!file.startsWith(root)) throw new HttpError(400, "path escapes its directory");
  return file;
}

/* Verify that the uploaded buffer's magic bytes match the declared extension. */
function verifyMagicBytes(buffer, ext) {
  if (buffer.length < 4) return false;
  switch (ext) {
    case "png":
      return buffer.length >= 8
        && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
        && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
    case "jpg":
    case "jpeg":
      return buffer.length >= 3
        && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "webp":
      return buffer.length >= 12
        && buffer.toString("ascii", 0, 4) === "RIFF"
        && buffer.toString("ascii", 8, 12) === "WEBP";
    case "gif":
      return buffer.length >= 6
        && (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a");
    default:
      return false;
  }
}

function postFile(date, slug) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const real = match && (() => {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const stamp = new Date(Date.UTC(year, month - 1, day));
    return stamp.getUTCFullYear() === year && stamp.getUTCMonth() === month - 1 && stamp.getUTCDate() === day;
  })();
  if (!real) throw new HttpError(400, "date must be a real YYYY-MM-DD");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new HttpError(400, "slug must be lowercase letters, numbers and hyphens");
  return safeFile(POSTS, `${date}-${slug}.md`);
}

/* ---------- child processes: fixed commands only ---------- */

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: ROOT, maxBuffer: 8 * 1024 * 1024, windowsHide: true, ...options }, (error, stdout, stderr) => {
      resolve({
        code: error ? (typeof error.code === "number" ? error.code : 1) : 0,
        output: `${stdout || ""}${stderr || ""}`.trim(),
      });
    });
  });
}

const build = () => run("node", ["scripts/build.mjs"]);
const check = () => run("node", ["scripts/check.mjs"]);
const status = () => run("git", ["status", "--porcelain"]);
const diffStat = () => run("git", ["diff", "--stat"]);

/* ---------- posts ---------- */

function readPosts() {
  if (!fs.existsSync(POSTS)) return [];
  return fs.readdirSync(POSTS)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => {
      const file = path.join(POSTS, name);
      const { data, body } = parseFrontMatter(fs.readFileSync(file, "utf8"));
      return {
        file: name,
        title: data.title || "",
        slug: data.slug || name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, ""),
        date: data.date || name.slice(0, 10),
        description: data.description || "",
        draft: String(data.draft || "false").toLowerCase() === "true",
        tags: (data.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        image: data.image || "",
        body,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

function writePost(input) {
  const rawTitle = String(input.title || "");
  const rawDescription = String(input.description || "");

  /* Reject newlines in title/description: a frontmatter injection vector
     that could splice extra YAML keys into the generated post. Strip them
     silently from slug, tags and image (they cannot inject frontmatter). */
  if (/\r|\n/.test(rawTitle)) throw new HttpError(400, "title must not contain newlines");
  if (/\r|\n/.test(rawDescription)) throw new HttpError(400, "description must not contain newlines");

  const title = rawTitle.replace(/[\r\n]+/g, "").trim();
  const slug = slugify(String(input.slug || title).replace(/[\r\n]+/g, ""));
  const date = String(input.date || localDate()).trim();
  const description = rawDescription.replace(/[\r\n]+/g, "").trim();
  const body = String(input.body || "");
  const tags = Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",");
  const draft = input.draft === true || input.draft === "true";
  const image = String(input.image || "").replace(/[\r\n]+/g, "").trim();

  if (!title) throw new HttpError(400, "a post needs a title");
  if (!description) throw new HttpError(400, "a post needs a description");
  if (description.length > 155) throw new HttpError(400, `description is ${description.length} characters (max 155)`);

  if (image) {
    if (!image.startsWith("/assets/images/posts/")) throw new HttpError(400, "image must start with /assets/images/posts/");
    if (image.includes("..")) throw new HttpError(400, "image path must not contain ..");
  }

  const file = postFile(date, slug);
  const lines = [
    "---",
    `title: ${title}`,
    `slug: ${slug}`,
    `date: ${date}`,
    `description: ${description}`,
    `draft: ${draft}`,
    `tags: ${tags.map((tag) => String(tag).trim()).filter(Boolean).join(", ")}`,
  ];
  if (image) lines.push(`image: ${image}`);
  lines.push("---", "", body.replace(/^\n+/, ""));

  const previous = input.file ? safeFile(POSTS, path.basename(String(input.file))) : null;
  fs.mkdirSync(POSTS, { recursive: true });
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
  if (previous && previous !== file && fs.existsSync(previous)) fs.unlinkSync(previous);
  return { file: path.basename(file), slug };
}

function previewPost(input) {
  const post = {
    title: String(input.title || "Untitled").trim(),
    slug: slugify(input.slug || input.title || "preview"),
    date: String(input.date || localDate()),
    updated: "",
    description: String(input.description || ""),
    draft: true,
    tags: (Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",")).map((tag) => String(tag).trim()).filter(Boolean),
    image: String(input.image || "").trim(),
    body: String(input.body || ""),
    minutes: readingTime(String(input.body || "")),
    url: "/posts/preview.html",
  };
  return renderPostPage(post, { posts: [], version: "preview", includeDrafts: true });
}

/* ---------- talks ---------- */

function readTalks() {
  if (!fs.existsSync(TALKS)) return [];
  try {
    const talks = JSON.parse(fs.readFileSync(TALKS, "utf8"));
    return Array.isArray(talks) ? talks : [];
  } catch {
    return [];
  }
}

function writeTalk(input) {
  const talks = readTalks();
  const index = Number.isInteger(input.index) ? input.index : -1;
  const talk = {
    title: String(input.title || "").trim(),
    date: String(input.date || "").trim(),
    event: String(input.event || "").trim(),
    location: String(input.location || "").trim(),
    url: String(input.url || "").trim(),
    linkLabel: String(input.linkLabel || "view →").trim(),
  };
  if (!talk.title) throw new HttpError(400, "a talk needs a title");
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(talk.date)) throw new HttpError(400, "talk date must be YYYY-MM or YYYY-MM-DD");
  if (!/^https?:\/\//.test(talk.url)) throw new HttpError(400, "a talk needs an http(s) link");
  if (input.slides && !/^https?:\/\//.test(String(input.slides))) throw new HttpError(400, "slides must be an http(s) URL");
  if (input.video && !/^https?:\/\//.test(String(input.video))) throw new HttpError(400, "video must be an http(s) URL");
  if (input.draft) talk.draft = true;
  if (input.slides) talk.slides = String(input.slides);
  if (input.video) talk.video = String(input.video);
  if (index >= 0 && index < talks.length) talks[index] = talk;
  else talks.push(talk);
  fs.writeFileSync(TALKS, `${JSON.stringify(talks, null, 2)}\n`);
  return { index: index >= 0 ? index : talks.length - 1 };
}

/* ---------- misc ---------- */

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

const json = (res, status, value) => send(res, status, JSON.stringify(value), "application/json; charset=utf-8");

function readBody(req, limit = MAX_UPLOAD) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on("data", (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        chunks.length = 0;
        reject(new HttpError(413, "that file is too large (5 MB max)"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks));
    });
    req.on("error", (error) => {
      if (done) return;
      done = true;
      reject(error);
    });
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  try {
    return JSON.parse(raw.toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
}

function allowOrigin(req) {
  const host = req.headers.host;
  if (host !== `${HOST}:${PORT}`) throw new HttpError(403, "wrong host");
  const origin = req.headers.origin;
  if (origin && origin !== `http://${HOST}:${PORT}`) throw new HttpError(403, "cross-origin request refused");
}

function requireToken(url) {
  if (url.searchParams.get("token") !== TOKEN) throw new HttpError(401, "bad token");
}

/* ---------- carrier ---------- */

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function serveAsset(res, pathname) {
  const rel = pathname.replace(/^\/+/, "");
  const file = path.resolve(ROOT, rel);
  const allowed = ["assets", "favicon.ico", "manifest.webmanifest"].some((entry) => rel === entry || rel.startsWith(`${entry}/`));
  if (!allowed || !file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    send(res, 404, "not found");
    return;
  }
  send(res, 200, fs.readFileSync(file), MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
}

/* ---------- routes ---------- */

async function api(req, res, url) {
  allowOrigin(req);
  requireToken(url);
  const action = url.pathname.replace(/^\/api\//, "");
  const method = req.method;

  if (method === "GET" && action === "state") {
    json(res, 200, { posts: readPosts(), talks: readTalks(), today: localDate() });
    return;
  }

  if (method === "POST" && action === "preview") {
    const body = await readJson(req);
    json(res, 200, { html: previewPost(body) });
    return;
  }

  if (method === "POST" && action === "post") {
    const body = await readJson(req);
    const saved = writePost(body);
    const built = await build();
    json(res, 200, { ...saved, build: built });
    return;
  }

  if (method === "POST" && action === "talk") {
    const body = await readJson(req);
    const saved = writeTalk(body);
    const built = await build();
    json(res, 200, { ...saved, build: built });
    return;
  }

  if (method === "POST" && action === "delete") {
    const body = await readJson(req);
    fs.mkdirSync(TRASH, { recursive: true });
    if (body.kind === "post") {
      const file = safeFile(POSTS, path.basename(String(body.file || "")));
      if (!fs.existsSync(file)) throw new HttpError(404, "that post is already gone");
      fs.renameSync(file, safeFile(TRASH, `${Date.now()}-${path.basename(file)}`));
    } else {
      const talks = readTalks();
      const index = Number(body.index);
      if (!Number.isInteger(index) || index < 0 || index >= talks.length) throw new HttpError(404, "that talk is already gone");
      /* Keep a backup of talks.json before mutating it. */
      fs.copyFileSync(TALKS, safeFile(TRASH, `${Date.now()}-talks.json`));
      talks.splice(index, 1);
      fs.writeFileSync(TALKS, `${JSON.stringify(talks, null, 2)}\n`);
    }
    const built = await build();
    json(res, 200, { deleted: true, build: built });
    return;
  }

  if (method === "POST" && action === "upload") {
    const slug = slugify(url.searchParams.get("slug") || "");
    const alt = String(url.searchParams.get("alt") || "").trim();
    const name = String(url.searchParams.get("name") || "image");
    const ext = path.extname(name).replace(/^\./, "").toLowerCase();
    if (!slug) throw new HttpError(400, "save the post first: the image needs a slug");
    if (!alt) throw new HttpError(400, "alt text is required");
    if (!IMAGE_TYPES[ext]) throw new HttpError(415, "only png, jpg, webp and gif are allowed");
    const buffer = await readBody(req);
    if (!buffer.length) throw new HttpError(400, "empty file");
    if (buffer.length > MAX_UPLOAD) throw new HttpError(413, "that file is too large (5 MB max)");
    if (!verifyMagicBytes(buffer, ext)) throw new HttpError(415, "file content does not match the declared image type");
    const folder = safeFile(IMAGES, slug);
    fs.mkdirSync(folder, { recursive: true });
    const clean = `${slugify(path.basename(name, path.extname(name))) || "image"}.${ext}`;
    fs.writeFileSync(safeFile(folder, clean), buffer);
    const src = `/assets/images/posts/${slug}/${clean}`;
    /* Escape [ ] and newlines in alt so they cannot break the Markdown image syntax. */
    const safeAlt = alt.replace(/\[/g, "&#91;").replace(/\]/g, "&#93;").replace(/\r?\n/g, " ");
    json(res, 200, { src, markdown: `![${safeAlt}](${src})` });
    return;
  }

  if (method === "POST" && action === "run") {
    const body = await readJson(req);
    if (body.what === "build") {
      const built = await build();
      json(res, 200, { output: built.output, ok: built.code === 0 });
      return;
    }
    if (body.what === "check") {
      const checked = await check();
      json(res, 200, { output: checked.output, ok: checked.code === 0 });
      return;
    }
    if (body.what === "publish") {
      const built = await build();
      const checked = await check();
      if (checked.code !== 0) throw new HttpError(409, "check failed, so nothing was committed", { output: `${built.output}\n${checked.output}` });

      /* Refuse to publish from a branch other than main unless forced. */
      const branch = await run("git", ["branch", "--show-current"]);
      if (branch.output.trim() !== "main" && !body.force) {
        throw new HttpError(409, `refusing to publish from branch "${branch.output.trim()}" — pass force:true to override`);
      }

      const porcelain = await status();
      const lines = porcelain.output.split(/\r?\n/).filter((line) => line.trim());
      const files = lines.map((line) => line.slice(3).trim());
      const unrelated = files.filter((file) => !/^(content|posts|assets)\/|^(blog|talks|index|now|uses|404)\.html$|^(feed|sitemap)\.xml$/.test(file));
      if (unrelated.length && !body.force) {
        throw new HttpError(409, "this working tree has unrelated changes", { unrelated, files });
      }
      if (!files.length) throw new HttpError(409, "nothing to publish, the working tree is clean");

      const post = readPosts().find((item) => files.includes(`content/posts/${item.file}`));
      const message = post ? `post: ${post.title}` : files.includes("content/talks.json") ? "talk: talks update" : "chore: rebuild generated files";
      const added = await run("git", ["add", "-A"]);
      if (added.code !== 0) throw new HttpError(500, "git add failed", { output: added.output });
      const committed = await run("git", ["commit", "-m", message]);
      if (committed.code !== 0) throw new HttpError(500, "git commit failed", { output: committed.output });
      const pushed = await run("git", ["push"]);
      const stat = await diffStat();
      json(res, 200, {
        committed: committed.output,
        pushed: pushed.output,
        pushOk: pushed.code === 0,
        stat: stat.output,
        url: `${SITE}/blog.html`,
      });
      return;
    }
    throw new HttpError(400, "unknown action");
  }

  throw new HttpError(404, "unknown endpoint");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await api(req, res, url);
      return;
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      allowOrigin(req);
      send(res, 200, fs.readFileSync(STUDIO_HTML), "text/html; charset=utf-8");
      return;
    }
    if (req.method === "GET") {
      serveAsset(res, url.pathname);
      return;
    }
    send(res, 405, "method not allowed");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error(`studio: ${error.message}`);
    json(res, status, { error: error.message, ...(error.extra || {}) });
  }
});

server.listen(PORT, HOST, () => {
  fs.mkdirSync(TRASH, { recursive: true });
  console.log(`studio: http://${HOST}:${PORT}/?token=${TOKEN}`);
  console.log("studio: this token is required for every write. press ctrl+c to stop.");
});
