// The wiki-check op (#215) against a real wiki checkout: issue #7's committed
// wiki pages compared with the wiki's master on origin, in-process and through
// the ops CLI.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { okLine, opsFixture } from "./ops-fixture.mjs";

const fx = await opsFixture("wiki-check");
const { wikiCheck } = await import("../src/ops/wiki-check.ts");

const ISSUE = 7;
const GIT_USER = "-c user.email=a@b -c user.name=a";
const CFG = { repo: "o/r", slug: "o__r", commands: { test: "true" } };
const WIKI_CFG = { ...CFG, wiki: true };
const BAD_REQUEST = /bad wiki-check request/u;
// The keys in the order the ops CLI prints them.
const CLEAN = { checks: [], pass: true };

// A bare wiki origin on master with Home and _Sidebar, cloned as issue #7's
// wiki checkout so that origin/master exists. Returns the checkout.
function wikiCheckout() {
  const origin = path.join(fx.root, "wiki.git");
  const dir = path.join(fx.worktree(ISSUE), "wiki");
  fs.rmSync(origin, { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(fx.worktree(ISSUE), { recursive: true });
  fx.sh(`git init -q --bare -b master ${origin}`);
  fx.sh(`git clone -q ${origin} ${dir} 2>/dev/null`);
  commitPages(dir, {
    "Home.md": "Welcome.",
    "_Sidebar.md": "- [[Home]]",
  });
  fx.sh(`git -C ${dir} push -q origin HEAD:master`);
  return dir;
}

// Writes and commits pages in the checkout, which then is ahead of master.
function commitPages(dir, pages) {
  for (const [file, text] of Object.entries(pages)) {
    fs.writeFileSync(path.join(dir, file), `${text}\n`);
  }
  fx.sh(`git -C ${dir} add -A && git -C ${dir} ${GIT_USER} commit -qm pages`);
}

test("a new orphan page and a broken link fail until they are fixed", () => {
  const dir = wikiCheckout();
  commitPages(dir, { "New-Page.md": "See [[Missing Page]] and [[Home]]." });
  assert.deepEqual(wikiCheck(WIKI_CFG, { number: ISSUE }), {
    pass: false,
    checks: [
      {
        id: "wiki-link:New-Page:Missing Page",
        pass: false,
        detail:
          "New-Page links to Missing Page, which is not a page on the wiki branch",
      },
      {
        id: "wiki-orphan:New-Page",
        pass: false,
        detail:
          "new page New-Page is not linked from _Sidebar or any other wiki page",
      },
    ],
  });
  commitPages(dir, {
    "New-Page.md": "See [[Home]].",
    "_Sidebar.md": "- [[Home]]\n- [[New Page]]",
  });
  assert.deepEqual(wikiCheck(WIKI_CFG, { number: ISSUE }), CLEAN);
});

test("uncommitted edits are ignored", () => {
  const dir = wikiCheckout();
  commitPages(dir, { "Home.md": "Welcome to [[Home]]." });
  fs.writeFileSync(path.join(dir, "Home.md"), "[[Uncommitted Nope]]\n");
  assert.deepEqual(wikiCheck(WIKI_CFG, { number: ISSUE }), CLEAN);
});

test("no wiki, or no commits ahead of it, is nothing to check", () => {
  const dir = wikiCheckout();
  assert.deepEqual(wikiCheck(WIKI_CFG, { number: ISSUE }), CLEAN);
  commitPages(dir, { "Home.md": "[[Missing Page]]" });
  assert.deepEqual(wikiCheck(CFG, { number: ISSUE }), CLEAN);
});

test("the ops CLI runs wiki-check and rejects a request with no number", () => {
  assert.equal(
    fx.ask({ op: "wiki-check", number: ISSUE }),
    okLine("wiki-check", CLEAN),
  );
  const bad = JSON.parse(fx.ask({ op: "wiki-check" }));
  assert.equal(bad.ok, false);
  assert.match(bad.error, BAD_REQUEST);
});
