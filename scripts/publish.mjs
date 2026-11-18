#!/usr/bin/env node
/* Build, check, then commit and push what changed.
   node scripts/publish.mjs          (asks before committing)
   node scripts/publish.mjs --yes    (no prompt)                  */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseFrontMatter } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auto = process.argv.includes("--yes");

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
const run = (file) => execFileSync(process.execPath, [file], { cwd: ROOT, stdio: "inherit" });

async function ask(question) {
  if (!process.stdin.isTTY) {
    console.error("\npublish: this needs a terminal, or pass --yes.");
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim().toLowerCase();
  } finally {
    rl.close();
  }
}

function step(message) {
  console.log(`\n${message}`);
}

/* ---------- 1. build ---------- */

step("build");
run(path.join(ROOT, "scripts", "build.mjs"));

/* ---------- 2. check ---------- */

step("check");
try {
  run(path.join(ROOT, "scripts", "check.mjs"));
} catch {
  console.error("\npublish: check failed, nothing was committed.");
  process.exit(1);
}

/* ---------- 3. what changed ---------- */

const status = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter((line) => line.trim());
if (!status.length) {
  console.log("\npublish: nothing to publish, the working tree is clean.");
  process.exit(0);
}

const files = status.map((line) => line.slice(3).trim());
const unrelated = files.filter((file) => !/^content\/|^posts\/|^assets\/|^(blog|talks|index|now|uses|404)\.html$|^feed\.xml$|^sitemap\.xml$/.test(file));

/* ---------- 4. title ---------- */

function commitTitle() {
  const postFiles = files.filter((file) => /^content\/posts\/.*\.md$/.test(file) && !path.basename(file).startsWith("_"));
  if (postFiles.length) {
    const { data } = parseFrontMatter(fs.readFileSync(path.join(ROOT, postFiles[0]), "utf8"));
    return { prefix: "post", title: (data.title || path.basename(postFiles[0], ".md")).trim() };
  }
  if (files.includes("content/talks.json")) {
    let title = "";
    try {
      const diff = git("diff", "--", "content/talks.json");
      const added = diff.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"));
      const match = added.join("\n").match(/"title":\s*"([^"]+)"/);
      if (match) title = match[1];
    } catch { /* new file, fall through */ }
    return { prefix: "talk", title: title || "talks update" };
  }
  return { prefix: "chore", title: "rebuild generated files" };
}

const { prefix, title } = commitTitle();
const message = `${prefix}: ${title}`;

/* ---------- 5. confirm ---------- */

console.log(`\n${status.length} file(s) changed:`);
for (const item of status) console.log(`  ${item}`);

if (unrelated.length) {
  console.log("\nwarning: these files are outside the content pipeline:");
  for (const file of unrelated) console.log(`  ${file}`);
  console.log("they will be committed too. Press Ctrl+C if that is a mistake.");
}

if (unrelated.length && !auto) {
  const answer = await ask("\ncontinue with these files? [y/N] ");
  if (answer !== "y" && answer !== "yes") {
    console.log("publish: stopped, nothing was committed.");
    process.exit(0);
  }
}

if (!auto) {
  const answer = await ask(`\ncommit as "${message}" and push? [y/N] `);
  if (answer !== "y" && answer !== "yes") {
    console.log("publish: stopped, nothing was committed.");
    process.exit(0);
  }
}

/* ---------- 6. commit and push ---------- */

git("add", "-A");
const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: ROOT, encoding: "utf8" }).trim();
if (!staged) {
  console.log("\npublish: nothing staged, the working tree is already clean.");
  process.exit(0);
}
git("commit", "-m", message);
console.log(`\ncommitted: ${message}`);

try {
  git("push");
  console.log("pushed to origin.");
} catch (error) {
  console.error("\nthe commit exists locally but the push failed:");
  console.error(String(error.stderr || error.message).trim());
  console.error("\nrun `git push` when the remote is reachable. The commit is safe.");
  process.exit(1);
}

console.log("\ndone. GitHub Pages will serve the new files in a minute or two.");
