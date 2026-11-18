// Renders ornaments-draft.svg (or the file given) on the real texture, inline
// and as CSS masks, at the slot sizes, and saves a screenshot.
// Run from the repository root:
//   node outputs/theme-redesign/themes/soot-brass/tools/preview_ornaments.mjs SPRITE OUT.png
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { chromium } = require("playwright");
const [spritePath, outPath] = process.argv.slice(2);
const sprite = readFileSync(spritePath, "utf8");
const tex = readFileSync(resolve(root, "apps/web/public/textures/soot-brass.webp")).toString("base64");
const ink = "rgb(172 150 108)", accent = "rgb(226 196 132)";

// One mask image per symbol and ink, as the build would make them.
const syms = [...sprite.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)].map(([, id, vb, body]) => {
  const lines = body.split("\n").filter((l) => l.trim());
  const main = lines.filter((l) => !l.includes('data-ink="accent"')).join("");
  const acc = lines.filter((l) => l.includes('data-ink="accent"')).join("");
  const url = (b) => `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${b}</svg>`)}')`;
  const [, , w, h] = vb.split(" ").map(Number);
  return { id, w, h, main: url(main), acc: url(acc) };
});
const sizes = { "orn-heading": [16, 32], "orn-divider": [44, 96], "orn-corner": [20, 48], "orn-band": [12, 36], "orn-emblem": [48, 96], "orn-swatch": [52, 88], "orn-portrait": [120, 200], "orn-bullet": [8, 24], "orn-rule-end": [24, 72], "orn-vignette": [120, 240], "orn-notice": [12, 36] };
const cells = syms.map((s) => {
  const [small, big] = sizes[s.id] ?? [s.w, s.w * 2];
  const m = (px) => `<span class="m" style="width:${px}px;height:${(px * s.h) / s.w}px;--m:${s.main};--a:${s.acc}"></span>`;
  return `<figure><div class="row">${m(small)}${m(big)}<svg style="width:${big}px;height:${(big * s.h) / s.w}px;color:${ink}" viewBox="0 0 ${s.w} ${s.h}"><use href="#${s.id}"/></svg></div><figcaption>${s.id} · ${small}px / ${big}px</figcaption></figure>`;
}).join("");
const band = syms.find((s) => s.id === "orn-band");
const html = `<!doctype html><style>
body{margin:0;padding:24px;background:rgb(33 23 26) url(data:image/webp;base64,${tex}) center/cover fixed;color:rgb(238 228 210);font:14px Georgia}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
figure{margin:0;padding:12px;border:1px solid rgb(172 150 108 / .4)}
.row{display:flex;gap:18px;align-items:center;min-height:90px}
.m{position:relative;display:inline-block}
.m::before,.m::after{content:"";position:absolute;inset:0;background:${ink};-webkit-mask:var(--m) center/contain no-repeat}
.m::after{background:${accent};-webkit-mask-image:var(--a)}
.band{height:8px;margin:16px 0;background:${ink};-webkit-mask:${band.main} left center/auto 100% repeat-x}
.trail{height:56px;background:rgb(50 33 38);border-bottom:2px solid rgb(172 150 108)}
</style>${sprite.replace("<svg ", '<svg style="display:none" ')}
<div class="trail"></div><div class="band"></div>
<div class="grid">${cells}</div>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log("saved", outPath);
