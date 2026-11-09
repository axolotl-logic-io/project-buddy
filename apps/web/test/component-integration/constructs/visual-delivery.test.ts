import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { expect, test } from "vitest";
import {
  VISUAL_WIDTH,
  VISUAL_WIDTHS,
  visualImageLoader,
} from "@/constructs/visual-delivery.ts";

const AVATAR_SOURCE_WIDTH = 160;
const LARGE_REQUEST = 2048;
const MAX_SIZE_RATIO = 0.2;

test("every advertised built-in size is a compressed square WebP", async () => {
  await Promise.all(
    ["lumen-v1", "vellum-v1"].map(async (artwork) => {
      const original = await readFile(`public/constructs/${artwork}.png`);
      await Promise.all(
        VISUAL_WIDTHS.map(async (width) => {
          const path = visualImageLoader({
            src: `/constructs/${artwork}.png`,
            width,
          });
          const bytes = await readFile(`public${path}`);
          expect(await sharp(bytes).metadata()).toMatchObject({
            width,
            height: width,
            format: "webp",
          });
          expect(bytes.length).toBeLessThan(original.length * MAX_SIZE_RATIO);
        }),
      );
    }),
  );
});

test("delivery rounds up for cropped avatars and bounds large requests", () => {
  const src = "/constructs/lumen-v1.png";
  expect(visualImageLoader({ src, width: AVATAR_SOURCE_WIDTH })).toBe(
    "/constructs/lumen-v1-256.webp",
  );
  expect(visualImageLoader({ src, width: LARGE_REQUEST })).toBe(
    "/constructs/lumen-v1-1024.webp",
  );
  const privateSource = "/api/constructs/visuals/construct/destination/asset";
  expect(
    visualImageLoader({
      src: privateSource,
      width: AVATAR_SOURCE_WIDTH,
    }),
  ).toBe(`${privateSource}?width=256`);
  expect(VISUAL_WIDTH.safeParse(LARGE_REQUEST).success).toBe(false);
});
