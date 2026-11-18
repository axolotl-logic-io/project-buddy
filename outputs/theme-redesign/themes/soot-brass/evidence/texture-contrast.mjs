// Samples apps/web/public/textures/soot-brass.webp in Chromium and checks
// the Soot & Brass palette against its light and dark areas, and against
// the opaque surfaces. Run from the repository root:
//   node outputs/theme-redesign/themes/soot-brass/evidence/texture-contrast.mjs [palette.json]
// It reads the texture only; it never writes to it.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { chromium } = require("playwright");

const texture = readFileSync(resolve(root, "apps/web/public/textures/soot-brass.webp"));
const paletteFile = process.argv[2] ?? resolve(root, "outputs/theme-redesign/themes/soot-brass/evidence/palette.json");
const palette = JSON.parse(readFileSync(paletteFile, "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage();
const stats = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/webp;base64,${b64}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const px = [];
  for (let i = 0; i < data.length; i += 4) px.push([lum(data[i], data[i + 1], data[i + 2]), data[i], data[i + 1], data[i + 2]]);
  // 8 px blocks: about the stem width of 16 px body text at the texture's
  // scale on a 1280 px page, so a block mean is what a glyph sits on.
  const B = 8, blocks = [];
  for (let y = 0; y < height; y += B) for (let x = 0; x < width; x += B) {
    let r = 0, g = 0, bl = 0, n = 0;
    for (let yy = y; yy < y + B; yy++) for (let xx = x; xx < x + B; xx++) {
      const i = (yy * width + xx) * 4; r += data[i]; g += data[i + 1]; bl += data[i + 2]; n++;
    }
    r /= n; g /= n; bl /= n;
    blocks.push([lum(r, g, bl), Math.round(r), Math.round(g), Math.round(bl)]);
  }
  const pick = (arr, q) => { const s = [...arr].sort((a, b) => a[0] - b[0]); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  const qs = [0, 0.01, 0.05, 0.5, 0.95, 0.99, 0.999, 1];
  let mr = 0, mg = 0, mb = 0;
  for (const p of px) { mr += p[1]; mg += p[2]; mb += p[3]; }
  return {
    size: [width, height],
    mean: [mr / px.length, mg / px.length, mb / px.length].map(Math.round),
    pixels: qs.map((q) => ({ q, rgb: pick(px, q).slice(1), L: pick(px, q)[0] })),
    blocks: qs.map((q) => ({ q, rgb: pick(blocks, q).slice(1), L: pick(blocks, q)[0] })),
  };
}, texture.toString("base64"));
await browser.close();

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const pxAt = (q) => stats.pixels.find((s) => s.q === q).rgb;
const blAt = (q) => stats.blocks.find((s) => s.q === q).rgb;
const grounds = {
  "texture darkest pixel": pxAt(0),
  "texture dark (1st pct block)": blAt(0.01),
  "texture median block": blAt(0.5),
  "texture light (99th pct block)": blAt(0.99),
  "texture lightest block": blAt(1),
  "texture lightest pixel": pxAt(1),
};
for (const [k, v] of Object.entries(palette.surfaces)) grounds[k] = v;

const rows = [];
for (const check of palette.checks) {
  const fg = palette.colors[check.fg];
  const targets = check.on === "texture" ? Object.keys(grounds).filter((g) => g.startsWith("texture"))
    : check.on === "all" ? Object.keys(grounds) : check.on;
  for (const g of targets) {
    const bg = grounds[g] ?? palette.colors[g];
    const r = ratio(fg, bg);
    rows.push({ fg: check.fg, on: g, ratio: Math.round(r * 100) / 100, need: check.need, pass: r >= check.need });
  }
}
const out = { texture: stats, grounds, rows, failures: rows.filter((r) => !r.pass) };
writeFileSync(resolve(root, "outputs/theme-redesign/themes/soot-brass/evidence/texture-contrast.json"), JSON.stringify(out, null, 2));
console.log("texture", JSON.stringify(stats.mean), "\npixels", stats.pixels.map((p) => `${p.q}:${p.rgb.join(",")}`).join("  "));
console.log("blocks", stats.blocks.map((p) => `${p.q}:${p.rgb.join(",")}`).join("  "));
const worst = {};
for (const r of rows) { const k = `${r.fg} (need ${r.need})`; if (!worst[k] || r.ratio < worst[k].ratio) worst[k] = r; }
for (const [k, r] of Object.entries(worst)) console.log(`${r.pass ? "ok  " : "FAIL"} ${k.padEnd(34)} worst ${String(r.ratio).padStart(5)} on ${r.on}`);
