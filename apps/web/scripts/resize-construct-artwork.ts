import sharp from "sharp";
import { VISUAL_WIDTHS } from "../src/constructs/visual-delivery.ts";

// Run from apps/web; source reference PNGs remain immutable.
await Promise.all(
  ["lumen-v1", "vellum-v1"].flatMap((artwork) =>
    VISUAL_WIDTHS.map((width) =>
      sharp(`public/constructs/${artwork}.png`)
        .resize(width, width)
        .webp({ quality: 80 })
        .toFile(`public/constructs/${artwork}-${width}.webp`),
    ),
  ),
);
