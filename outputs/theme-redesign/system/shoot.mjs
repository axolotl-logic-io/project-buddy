// Screenshot the built mockups for the self-check.
//
// Run from the repository root after `python3 outputs/theme-redesign/build.py`:
//   node outputs/theme-redesign/system/shoot.mjs [VIEW ...]
// VIEW is a view file name without .html, such as quests--list. With no VIEW,
// the script shoots every view. It writes PNG files to system/evidence/ as
// VIEW--MODE--WIDTH.png, plus the specimen at each width.
import { chromium } from "playwright";
import { readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "evidence");
const views = join(here, "..", "views");
mkdirSync(out, { recursive: true });

const modes = ["light", "soot-brass", "dark"];
const widths = [[1280, 900], [360, 780]];
const asked = process.argv.slice(2);
const names = asked.length ? asked : readdirSync(views)
  .filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).sort();

const browser = await chromium.launch();
const problems = [];
for (const [width, height] of widths) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => problems.push(`${page.url()}: ${e.message}`));
  for (const name of names) {
    for (const mode of modes) {
      const url = pathToFileURL(join(views, `${name}.html`)).href +
        `?appearance=${mode}&width=${width}&bare`;
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      const wide = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (wide > 0) problems.push(`${name} ${mode} ${width}: ${wide}px horizontal overflow`);
      await page.screenshot({ path: join(out, `${name}--${mode}--${width}.png`), fullPage: true });
    }
  }
  if (!asked.length) {
    await page.goto(pathToFileURL(join(here, "specimen.html")).href);
    await page.evaluate(() => document.fonts.ready);
    const wide = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (wide > 0) problems.push(`specimen ${width}: ${wide}px horizontal overflow`);
    await page.screenshot({ path: join(out, `specimen--${width}.png`), fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "No overflow or script errors.");
