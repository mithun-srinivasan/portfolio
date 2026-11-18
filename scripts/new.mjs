#!/usr/bin/env node
/* Create a draft post or talk.
   node scripts/new.mjs post "Title"
   node scripts/new.mjs talk "Title"                         */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = path.join(ROOT, "content", "posts");
const TALKS = path.join(ROOT, "content", "talks.json");

const today = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const slugify = (value) => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60) || "untitled";

const [, , kind, ...rest] = process.argv;
const title = rest.join(" ").trim();

if (!kind || !["post", "talk"].includes(kind) || !title) {
  console.error('usage: node scripts/new.mjs post "A title"\n       node scripts/new.mjs talk "A title"');
  process.exit(1);
}

const slug = slugify(title);

if (kind === "post") {
  fs.mkdirSync(POSTS, { recursive: true });
  const file = path.join(POSTS, `${today()}-${slug}.md`);
  if (fs.existsSync(file)) {
    console.error(`already exists: ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
  const body = `---
title: ${title}
slug: ${slug}
date: ${today()}
description:
draft: true
tags:
---

Write the post here. The description above is what shows on the blog index,
in the feed, and in search results — write it first, keep it under 155 characters.
`;
  fs.writeFileSync(file, body);
  console.log(`created ${path.relative(ROOT, file)}`);
  console.log("");
  console.log("next:");
  console.log("  1. open the file, set description (<=155 chars) and tags");
  console.log("  2. put images in assets/images/posts/" + slug + "/");
  console.log(`  3. node scripts/build.mjs --drafts   (preview at http://127.0.0.1:4173/posts/${slug}.html)`);
  console.log("  4. set draft: false, then: node scripts/publish.mjs");
} else {
  const talks = JSON.parse(fs.readFileSync(TALKS, "utf8"));
  if (talks.some((talk) => slugify(talk.title) === slug)) {
    console.error(`a talk with that title is already in content/talks.json`);
    process.exit(1);
  }
  talks.push({
    title,
    date: today().slice(0, 7),
    event: "",
    location: "Chennai",
    url: "",
    linkLabel: "view →",
    draft: true,
  });
  fs.writeFileSync(TALKS, `${JSON.stringify(talks, null, 2)}\n`);
  console.log("added a draft talk to content/talks.json");
  console.log("");
  console.log("next:");
  console.log("  1. fill in event, the real date and the slides or video url");
  console.log("  2. node scripts/build.mjs --drafts   (preview at http://127.0.0.1:4173/talks.html)");
  console.log("  3. set \"draft\": false, then: node scripts/publish.mjs");
}
