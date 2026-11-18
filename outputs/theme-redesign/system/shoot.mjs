// Screenshot the built mockups for the self-check.
//
// Run from the repository root after `python3 outputs/theme-redesign/build.py`:
//   node outputs/theme-redesign/system/shoot.mjs [--out DIR] [VIEW[@MODE[@WIDTH]] ...]
// VIEW is a view file name without .html, such as quests--list, or
// "specimen" for system/specimen.html. MODE is light, soot-brass or dark and
// WIDTH is 1280 or 360; leaving them out shoots every combination. With no
// VIEW, the script shoots every view and the specimen. Files are written to
// DIR (default system/evidence/) as VIEW--MODE--WIDTH.png. The specimen
// holds all three appearances; its shot for MODE is that appearance's
// section only.
//
// The page texture is fixed to the viewport, as in the app, so a full-page
// screenshot would show it only in the first screen. Instead, the script
// grows the viewport to the page's (or the section's) height before each
// shot, up to 16000 px. A texture set to cover a 16000 px viewport would
// be scaled up many times and look coarse, so before growing the viewport
// the script pins each fixed texture to the size it has on an ordinary
// screen (1280 x 900 or 360 x 780). The textures tile without a seam, so
// they repeat down the tall shot at their true scale.
//
// To shrink the shots for the repository afterwards, run
//   python3 -I outputs/theme-redesign/system/compress.py DIR
import { chromium } from "playwright";
import { readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const views = join(here, "..", "views");
const args = process.argv.slice(2);
let out = join(here, "evidence");
const outAt = args.indexOf("--out");
if (outAt !== -1) {
  out = resolve(args[outAt + 1]);
  args.splice(outAt, 2);
}
mkdirSync(out, { recursive: true });

const modes = ["light", "soot-brass", "dark"];
const heights = { 1280: 900, 360: 780 };
const all = readdirSync(views).filter((f) => f.endsWith(".html"))
  .map((f) => f.slice(0, -5)).sort().concat("specimen");
const jobs = [];
for (const spec of args.length ? args : all) {
  const [name, mode, width] = spec.split("@");
  for (const w of width ? [+width] : [1280, 360]) {
    for (const m of mode ? [mode] : modes) {
      jobs.push({ name, mode: m, width: w });
    }
  }
}

// Give every fixed, covering background the pixel size it has at the
// ordinary screen size, so it keeps that scale when the viewport grows.
function pinTextures([w, h]) {
  return Promise.all([...document.querySelectorAll("*")].map(async (el) => {
    const cs = getComputedStyle(el);
    if (!cs.backgroundAttachment.includes("fixed") || cs.backgroundSize !== "cover") return;
    const url = /url\("?(.*?)"?\)/.exec(cs.backgroundImage)?.[1];
    if (!url) return;
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    el.style.backgroundSize =
      `${Math.ceil(img.naturalWidth * scale)}px ${Math.ceil(img.naturalHeight * scale)}px`;
  }));
}

const browser = await chromium.launch();
const problems = [];
const page = await browser.newPage();
page.on("pageerror", (e) => problems.push(`${page.url()}: ${e.message}`));
for (const { name, mode, width } of jobs) {
  await page.setViewportSize({ width, height: heights[width] });
  const url = name === "specimen"
    ? pathToFileURL(join(here, "specimen.html")).href
    : pathToFileURL(join(views, `${name}.html`)).href +
      `?appearance=${mode}&width=${width}&bare`;
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const size = await page.evaluate(() => ({
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
  }));
  await page.evaluate(pinTextures, [width, heights[width]]);
  if (size.over > 0) problems.push(`${name} ${mode} ${width}: ${size.over}px horizontal overflow`);
  const file = `${name}--${mode}--${width}.png`;
  if (name === "specimen") {
    const section = page.locator(`.specimen-mode[data-mode="${mode}"]`);
    const box = await section.evaluate((el) => ({
      top: el.getBoundingClientRect().top + window.scrollY,
      height: el.getBoundingClientRect().height,
    }));
    await page.setViewportSize({ width, height: Math.min(Math.ceil(box.height), 16000) });
    await page.evaluate((top) => window.scrollTo(0, top), box.top);
    await page.screenshot({ path: join(out, file) });
    continue;
  }
  await page.setViewportSize({ width, height: Math.min(Math.max(size.height, heights[width]), 16000) });
  await page.screenshot({ path: join(out, file) });
}
await browser.close();
console.log(`${jobs.length} shots in ${out}`);
console.log(problems.length ? problems.join("\n") : "No overflow or script errors.");
