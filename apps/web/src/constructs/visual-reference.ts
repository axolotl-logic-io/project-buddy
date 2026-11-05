// Node-only boundary: reads only versioned repository artwork, never caller paths.
import { readFile } from "node:fs/promises";
import { z } from "zod";

const ARTWORK = z.enum(["lumen-v1", "vellum-v1"]);
async function readBuiltInVisualReference(
  artwork: unknown,
): Promise<Uint8Array | undefined> {
  const parsed = ARTWORK.safeParse(artwork);
  if (!parsed.success) {
    return undefined;
  }
  if (parsed.data === "lumen-v1") {
    return await readFile("public/constructs/lumen-v1.png");
  }
  return await readFile("public/constructs/vellum-v1.png");
}

export { readBuiltInVisualReference };
