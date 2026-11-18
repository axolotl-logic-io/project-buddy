// Captures the hydrated HTML and screenshots of the site's critical views,
// in each appearance and at 1280 px and 360 px wide. See README.md.
//
// Usage (from the repository root, with the dev server running):
//   BASE_URL=http://localhost:3100 \
//   REVIEW_STATE=/tmp/pb-capture/review.json \
//   EMPTY_STATE=/tmp/pb-capture/empty.json \
//   node outputs/theme-redesign/capture/capture.mjs [VIEW_FILTER]
//
// REVIEW_STATE and EMPTY_STATE are Playwright storage-state files holding a
// signed-in session for the review account and the empty account. Only
// their cookies are used. VIEW_FILTER, if given, is a substring that a
// "<view>--<state>" name must contain to be captured.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const FILTER = process.argv[2] ?? "";
const APPEARANCES = ["light", "soot-brass", "dark"];
// Width, and the window height used for overlays and as the minimum height.
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 360, height: 780 },
];
// Tall pages are captured by growing the window to the page's height, up to
// this many pixels, instead of Playwright's fullPage stitching, which
// misplaces the sticky header.
const MAX_HEIGHT = 5000;

const cookiesOf = (path) =>
  path ? JSON.parse(readFileSync(path, "utf8")).cookies : [];
const ACCOUNTS = {
  anon: [],
  review: cookiesOf(process.env.REVIEW_STATE),
  empty: cookiesOf(process.env.EMPTY_STATE),
};

const QUEST_LEARN = "Read Latin on old maps";
const QUEST_MAKE = "Build a walnut bookshelf";
const QUEST_DONE = "Run the autumn book swap";
const SPELL = "Workshop log";

// ---------------------------------------------------------------- helpers

const phone = (width) => width < 1024;

async function openQuestSidebar(page, width) {
  if (phone(width)) {
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    await page.waitForTimeout(500);
  }
}

async function questTab(page, width, name) {
  await openQuestSidebar(page, width);
  await page.getByRole("tab", { name }).click();
  await page.waitForTimeout(400);
}

async function typeInComposer(page, text) {
  const box = page.getByRole("textbox", { name: "Message" });
  await box.fill(text);
  return box;
}

// ---------------------------------------------------------------- states
// account: anon | review | empty. path: a string, or a function of the
// resolved ids. overlay: capture the window only (menus and dialogs).
// panelOnly: grow the window to fit the quest sidebar, not the whole page.
// docked: the desktop site panel is docked (localStorage), else closed.

const STATES = [
  { view: "sign-in", state: "default", account: "anon", path: "/login" },
  {
    view: "sign-in",
    state: "link-sent",
    account: "anon",
    path: "/login",
    async prepare(page) {
      await page
        .getByRole("textbox", { name: "Email address" })
        .fill("capture-review@project-buddy.test");
      await page.getByRole("button", { name: "Email me a link" }).click();
      await page.waitForTimeout(1500);
    },
  },
  { view: "sign-up", state: "default", account: "anon", path: "/signup" },
  {
    view: "quests",
    state: "list",
    account: "review",
    path: "/quests",
    docked: true,
  },
  {
    view: "quests",
    state: "completed-tab",
    account: "review",
    path: "/quests",
    async prepare(page) {
      await page.getByRole("tab", { name: /Completed/ }).click();
    },
  },
  { view: "quests", state: "empty", account: "empty", path: "/quests" },
  {
    view: "quests",
    state: "new-quest-dialog",
    account: "review",
    path: "/quests",
    overlay: true,
    async prepare(page) {
      await page.getByRole("button", { name: "Learn a thing" }).click();
    },
  },
  {
    view: "site-panel",
    state: "open",
    account: "review",
    path: "/quests",
    overlay: true,
    async prepare(page) {
      await page.getByRole("button", { name: "Site panel" }).click();
    },
  },
  {
    view: "quick-note",
    state: "dialog",
    account: "review",
    path: "/quests",
    overlay: true,
    async prepare(page) {
      await page.getByRole("button", { name: "Site panel" }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Quick Note" }).click();
    },
  },
  {
    view: "quest",
    state: "conversation",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
  },
  {
    view: "quest",
    state: "spell-conversation",
    account: "review",
    path: (ids) => ids.quests[QUEST_MAKE],
  },
  {
    view: "quest",
    state: "ideas",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    prepare: (page, width) => questTab(page, width, "Ideas"),
    panelOnly: true,
  },
  {
    view: "quest",
    state: "quick-notes",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    prepare: (page, width) => questTab(page, width, "Quick Notes"),
    panelOnly: true,
  },
  {
    view: "quest",
    state: "progress",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    prepare: (page, width) => questTab(page, width, "Progress"),
    panelOnly: true,
  },
  {
    view: "quest",
    state: "completed",
    account: "review",
    path: (ids) => ids.quests[QUEST_DONE],
  },
  {
    view: "quest",
    state: "composer-commands",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    overlay: true,
    async prepare(page) {
      await typeInComposer(page, "");
      await page.getByRole("textbox", { name: "Message" }).pressSequentially("/");
    },
  },
  {
    view: "quest",
    state: "command-error",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    overlay: true,
    async prepare(page) {
      const box = await typeInComposer(page, "/done 9");
      await box.press("Enter");
      await page.waitForTimeout(1200);
    },
  },
  {
    view: "quest",
    state: "loading-reply",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    overlay: true,
    async prepare(page) {
      // Hold the reply: the request never reaches the server, so nothing is
      // saved, and the page shows its waiting state.
      await page.route("**/api/chat**", () => {});
      const box = await typeInComposer(page, "look");
      await box.press("Enter");
      await page.waitForTimeout(1500);
    },
  },
  {
    view: "quest",
    state: "row-menu",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    overlay: true,
    async prepare(page, width) {
      await openQuestSidebar(page, width);
      await page
        .getByRole("button", { name: /^Actions for/ })
        .first()
        .click();
    },
  },
  {
    view: "quest",
    state: "confirm-dialog",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    overlay: true,
    async prepare(page, width) {
      await questTab(page, width, "Progress");
      await page
        .getByRole("button", { name: /^Delete the milestone/ })
        .first()
        .click();
    },
  },
  {
    view: "quest",
    state: "sidebar-drawer",
    account: "review",
    path: (ids) => ids.quests[QUEST_LEARN],
    overlay: true,
    onlyPhone: true,
    prepare: (page, width) => openQuestSidebar(page, width),
  },
  { view: "spellbook", state: "list", account: "review", path: "/spellbook" },
  {
    view: "spellbook",
    state: "yours-empty",
    account: "empty",
    path: "/spellbook",
    async prepare(page) {
      await page.getByRole("button", { name: /^Yours/ }).click();
    },
  },
  {
    view: "spell",
    state: "editor",
    account: "review",
    path: (ids) => ids.spells[SPELL],
  },
  {
    view: "spell",
    state: "invalid-field",
    account: "review",
    path: (ids) => ids.spells[SPELL],
    async prepare(page) {
      // The draft stays in this throwaway browser context; the empty name is
      // refused, so nothing is saved.
      await page.getByRole("textbox", { name: "Name" }).fill("");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.waitForTimeout(1000);
    },
  },
  {
    view: "spell",
    state: "built-in",
    account: "review",
    path: "/spellbook/tasks",
  },
  { view: "timer", state: "setup", account: "review", path: "/timer" },
  {
    view: "timer",
    state: "running-work",
    account: "review",
    // 18 minutes into a 50-minute work period.
    path: () => `/timer/50/10/${Date.now() - 18 * 60_000}`,
  },
  {
    view: "timer",
    state: "running-break",
    account: "review",
    // 4 minutes into the 10-minute break.
    path: () => `/timer/50/10/${Date.now() - 54 * 60_000}`,
  },
  {
    view: "timer",
    state: "preferences",
    account: "review",
    path: () => `/timer/50/10/${Date.now() - 18 * 60_000}`,
    overlay: true,
    async prepare(page) {
      await page.getByRole("button", { name: "Timer preferences" }).click();
    },
  },
  { view: "settings", state: "default", account: "review", path: "/settings" },
  {
    view: "profile",
    state: "experience",
    account: "review",
    path: "/profile",
  },
  { view: "profile", state: "empty", account: "empty", path: "/profile" },
  {
    view: "construct",
    state: "vellum",
    account: "review",
    path: "/constructs/vellum",
  },
  {
    view: "construct",
    state: "lumen",
    account: "review",
    path: "/constructs/lumen",
  },
];

// ---------------------------------------------------------------- capture

async function newContext(browser, account, mode, size, docked) {
  const context = await browser.newContext({ viewport: size });
  await context.addCookies([
    ...ACCOUNTS[account],
    { name: "theme", value: `parchment.${mode}`, url: BASE },
  ]);
  await context.addInitScript((isDocked) => {
    if (isDocked) {
      localStorage.setItem("site-panel", "docked");
    } else {
      localStorage.removeItem("site-panel");
    }
  }, docked === true);
  return context;
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

// Removes the Next.js development overlay, which production doesn't have.
async function removeDevOverlay(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("nextjs-portal")) {
      element.remove();
    }
  });
}

// Saves a compiled stylesheet once, in css/, with the texture URLs pointed
// at apps/web/public so a saved page shows its texture when opened from
// disk. Font URLs stay as Next.js built them and don't resolve from disk.
const savedStylesheets = new Map();
async function saveStylesheet(href) {
  if (!savedStylesheets.has(href)) {
    const file = href.split("/").pop().replace(/[^\w.-]/g, "_");
    const css = await (await fetch(`${BASE}${href}`)).text();
    writeFileSync(
      join(HERE, "css", file),
      css.replaceAll(
        'url("/textures/',
        'url("../../../../apps/web/public/textures/',
      ),
    );
    savedStylesheets.set(href, file);
  }
  return savedStylesheets.get(href);
}

// The DOM without scripts: the RSC payload and dev tooling are not markup.
// Stylesheet links point at the copies in css/.
async function markup(page) {
  await removeDevOverlay(page);
  let html = (await page.content())
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*as="script"[^>]*>/gi, "");
  const hrefs = [
    ...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g),
  ].map((match) => match[1]);
  for (const href of new Set(hrefs)) {
    const file = await saveStylesheet(href);
    html = html.replaceAll(`href="${href}"`, `href="../css/${file}"`);
  }
  return html;
}

const normalize = (html) =>
  html
    .replace(/ data-mode="[^"]*"/g, "")
    .replace(/\d{1,2}:\d{2}/g, "")
    .replace(/\/timer\/\d+\/\d+\/\d+/g, "/timer/");

async function resolveIds(browser) {
  const context = await newContext(browser, "review", "light", WIDTHS[0]);
  const page = await context.newPage();
  const ids = { quests: {}, spells: {} };
  await page.goto(`${BASE}/quests`, { waitUntil: "networkidle" });
  for (const tab of ["Active", "Completed"]) {
    await page.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
    await page.waitForTimeout(400);
    for (const link of await page.getByRole("tabpanel").getByRole("link").all()) {
      ids.quests[(await link.innerText()).split("\n")[0].trim()] =
        await link.getAttribute("href");
    }
  }
  await page.goto(`${BASE}/spellbook`, { waitUntil: "networkidle" });
  for (const link of await page.locator("main a[href^='/spellbook/']").all()) {
    ids.spells[(await link.innerText()).split("\n")[0].trim()] =
      await link.getAttribute("href");
  }
  await context.close();
  return ids;
}

async function main() {
  mkdirSync(join(HERE, "html"), { recursive: true });
  mkdirSync(join(HERE, "screenshots"), { recursive: true });
  mkdirSync(join(HERE, "css"), { recursive: true });
  const browser = await chromium.launch();
  const ids = await resolveIds(browser);
  console.log(JSON.stringify(ids));
  const log = [];
  for (const spec of STATES) {
    const name = `${spec.view}--${spec.state}`;
    if (!name.includes(FILTER)) {
      continue;
    }
    let desktopHtml;
    for (const size of WIDTHS) {
      if (spec.onlyPhone && !phone(size.width)) {
        continue;
      }
      for (const mode of APPEARANCES) {
        const context = await newContext(
          browser,
          spec.account,
          mode,
          size,
          spec.docked,
        );
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const path =
          typeof spec.path === "function" ? spec.path(ids) : spec.path;
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        await settle(page);
        if (spec.prepare) {
          await spec.prepare(page, size.width);
          await settle(page);
        }
        await removeDevOverlay(page);
        if (mode === "light") {
          const html = await markup(page);
          if (!phone(size.width) || spec.onlyPhone) {
            writeFileSync(join(HERE, "html", `${name}.html`), html);
            desktopHtml = html;
          } else if (normalize(html) !== normalize(desktopHtml ?? "")) {
            writeFileSync(join(HERE, "html", `${name}--360.html`), html);
          }
        }
        if (!spec.overlay) {
          // A sidebar tab state shows the quest sidebar, not the whole
          // conversation again: the window grows to fit the sidebar on
          // desktop, or the open drawer on a phone.
          const height = await page.evaluate((panelOnly) => {
            if (panelOnly) {
              const drawer = document.querySelector(
                ".quest-sidebar-frame:modal",
              );
              if (drawer) {
                return drawer.scrollHeight;
              }
              const sidebar = document.querySelector(".quest-sidebar");
              if (!sidebar) {
                return 0;
              }
              return sidebar.getBoundingClientRect().top + sidebar.scrollHeight;
            }
            return Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            );
          }, spec.panelOnly === true);
          const tall = Math.min(Math.max(height, size.height), MAX_HEIGHT);
          if (tall !== size.height) {
            await page.setViewportSize({ width: size.width, height: tall });
            await page.waitForTimeout(500);
          }
        }
        const shot = `${name}--${mode}--${size.width}.png`;
        await page.screenshot({ path: join(HERE, "screenshots", shot) });
        const entry = {
          shot,
          url: page.url().replace(BASE, ""),
          mode: await page.evaluate(() =>
            document.documentElement.getAttribute("data-mode"),
          ),
          heading: await page
            .locator("h1")
            .first()
            .innerText({ timeout: 1000 })
            .catch(() => ""),
          errors,
        };
        log.push(entry);
        console.log(JSON.stringify(entry));
        await context.close();
      }
    }
  }
  // A filtered run replaces only its own entries in the log.
  const logPath = join(HERE, "capture-log.json");
  let kept = [];
  if (FILTER !== "") {
    const taken = new Set(log.map((entry) => entry.shot));
    try {
      kept = JSON.parse(readFileSync(logPath, "utf8")).filter(
        (entry) => !taken.has(entry.shot),
      );
    } catch {
      kept = [];
    }
  }
  writeFileSync(logPath, JSON.stringify([...kept, ...log], null, 1));
  await browser.close();
}

await main();
