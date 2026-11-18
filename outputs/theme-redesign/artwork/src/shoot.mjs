// Screenshots of specimen.html at 1280 and 360 px wide, plus close-ups of
// the small sizes at device pixel ratios 1 and 2.
//
// Usage, from the repository root:
//   node outputs/theme-redesign/artwork/src/shoot.mjs
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ART = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ART, "evidence");
const PAGE = pathToFileURL(join(ART, "specimen.html")).href;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const width of [1280, 360]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(PAGE);
  await page.screenshot({ path: join(OUT, `specimen-${width}.png`), fullPage: true });
  await page.close();
}

// Close-ups: the proposed and current small sizes in each appearance.
for (const scale of [1, 2]) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: scale,
  });
  await page.goto(PAGE);
  const sections = await page.$$("section.appearance");
  for (const [index, section] of sections.entries()) {
    const mode = await section.getAttribute("data-mode");
    const constructs = await section.$$(".construct");
    for (const construct of constructs) {
      const name = (await construct.$eval("h3", (h) => h.textContent)).toLowerCase();
      const strips = await construct.$$(".strip");
      // The first three cells of the proposed and current strips.
      const box = await strips[0].boundingBox();
      const box2 = await strips[1].boundingBox();
      const cropStrip = await strips[2].boundingBox();
      await page.screenshot({
        path: join(OUT, `small-${name}-${mode}-x${scale}.png`),
        fullPage: true,
        clip: {
          x: box.x - 4,
          y: box.y - 4,
          width: 290,
          height: box2.y + box2.height + 4 - box.y,
        },
      });
      // The whole proposed strip, to judge the drawing at full size.
      if (scale === 2) {
        await page.screenshot({
          path: join(OUT, `strip-${name}-${mode}.png`),
          fullPage: true,
          clip: { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 },
        });
      }
      void cropStrip;
      void index;
    }
  }
  await page.close();
}
await browser.close();
console.log(`Saved screenshots in ${OUT}`);
