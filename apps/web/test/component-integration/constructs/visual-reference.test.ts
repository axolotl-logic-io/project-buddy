import sharp from "sharp";
import { expect, test } from "vitest";
import { readBuiltInVisualReference } from "@/constructs/visual-reference.ts";

test("reference loader accepts only committed built-in artwork", async () => {
  expect(await readBuiltInVisualReference("../../.env.local")).toBeUndefined();
  expect(
    await readBuiltInVisualReference("https://example.test/art.png"),
  ).toBeUndefined();
  expect(
    await readBuiltInVisualReference({ artwork: "lumen-v1" }),
  ).toBeUndefined();
  const bytes = await readBuiltInVisualReference("lumen-v1");
  expect(bytes).toBeDefined();
  const metadata = await sharp(bytes).metadata();
  expect(metadata.format).toBe("png");
  expect(metadata.width).toBe(metadata.height);
});
