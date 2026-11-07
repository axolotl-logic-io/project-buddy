import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ConstructAvatar,
  ConstructIllustration,
} from "@/components/constructs/construct-visual.tsx";
import { getConstruct } from "@/constructs/index.ts";

const AVATAR_SIZE = 32;
const ARTWORK_WIDTH = 1024;

test("avatars expose names and fit small faces; decorative artwork is silent", async () => {
  await render(
    <div className="flex gap-2">
      <ConstructAvatar construct={getConstruct("lumen")} size={32} />
      <ConstructAvatar
        construct={getConstruct("vellum")}
        size={40}
        decorative={true}
      />
    </div>,
  );
  const image = page.getByRole("img", { name: "Lumen" });
  await expect.element(image).toBeVisible();
  expect(image.element().getBoundingClientRect().width).toBe(AVATAR_SIZE);
  await expect
    .element(page.getByRole("img", { name: "Vellum" }))
    .not.toBeInTheDocument();
});

test("custom and unavailable generated art have a visible initials fallback", async () => {
  await render(
    <ConstructIllustration
      visualRole="opening"
      construct={{
        name: "Paper Bird",
        definition: {
          prompt: "Hello",
          visual: {
            version: 1,
            description: "A folded paper bird",
            canonical: {
              kind: "generated",
              assetId: "fd6f3060-f92a-447f-af44-a0fef80582a9",
            },
          },
        },
      }}
    />,
  );
  await expect
    .element(page.getByRole("img", { name: "Paper Bird" }))
    .toBeVisible();
  await expect.element(page.getByText("PB")).toBeVisible();
});

test("committed artwork loads and an image failure reveals initials", async () => {
  const screen = await render(
    <ConstructAvatar construct={getConstruct("lumen")} />,
  );
  const image = screen.container.querySelector("img");
  if (image === null) {
    throw new Error("Artwork is missing");
  }
  if (!(image.complete && image.naturalWidth > 0)) {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener(
        "error",
        () => reject(new Error("Artwork failed to load")),
        { once: true },
      );
    });
  }
  await image.decode();
  expect(image.naturalWidth).toBeGreaterThan(0);
  expect(image.naturalWidth).toBeLessThan(ARTWORK_WIDTH);
  expect(image.currentSrc).toContain(".webp");
  image.dispatchEvent(new Event("error"));
  expect(image.hidden).toBe(true);
  await expect.element(page.getByText("L", { exact: true })).toBeVisible();
});
