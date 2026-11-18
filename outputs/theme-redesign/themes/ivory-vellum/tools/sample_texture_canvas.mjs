// Cross-checks sample_texture.py in Chromium: draws the unchanged texture to
// a canvas and reports pixel luminance extremes as the browser decodes them.
// Usage: node sample_texture_canvas.mjs PATH_TO_WEBP
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const data = readFileSync(process.argv[2]).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/webp;base64,${b64}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const Ls = [];
  for (let i = 0; i < d.length; i += 8) Ls.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
  Ls.sort((a, b) => a - b);
  const p = (q) => Ls[Math.min(Ls.length - 1, Math.floor(Ls.length * q))].toFixed(4);
  return { w: c.width, h: c.height, min: p(0), p1: p(0.01), p50: p(0.5), p99: p(0.99), max: p(1) };
}, data);
console.log(JSON.stringify(out));
await browser.close();
