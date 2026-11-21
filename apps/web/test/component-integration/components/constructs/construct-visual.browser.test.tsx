import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ConstructAvatar,
  ConstructIllustration,
} from "@/components/constructs/construct-visual.tsx";
import { getConstruct } from "@/constructs/index.ts";

const AVATAR_SIZE = 32;

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

test("a construct without built-in art has a visible initials fallback", async () => {
  await render(
    <ConstructIllustration
      visualRole="opening"
      construct={{
        name: "Paper Bird",
        definition: { prompt: "Hello" },
      }}
    />,
  );
  await expect
    .element(page.getByRole("img", { name: "Paper Bird" }))
    .toBeVisible();
  await expect.element(page.getByText("PB")).toBeVisible();
});
