import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { GeneratedImagePart } from "@/components/chat/generated-image-part.tsx";
import { GENERATION_ID } from "@/images/generation-contract.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

const ID = GENERATION_ID.parse("baaf1045-0bcb-4f49-b600-18cfeb6936f4");
const PROMPT = "A blue bird above a forest";
const CHAT_IMAGE_HEIGHT_PX = 288;

test("an adventure's generated image keeps its fixed height", async () => {
  await render(
    <GeneratedImagePart
      part={{ result: { status: "generated", id: ID, prompt: PROMPT } }}
    />,
  );
  const image = page
    .getByRole("link", { name: GENERATION_COPY.view })
    .element()
    .querySelector("img");
  expect(image?.getBoundingClientRect().height).toBe(CHAT_IMAGE_HEIGHT_PX);
});

test("announces generation progress", async () => {
  await render(<GeneratedImagePart part={{ result: undefined }} />);
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent(GENERATION_COPY.working);
});

test.each(["failed", "unavailable", "outOfGold", "pending"] as const)(
  "explains a %s result without showing a broken image",
  async (status) => {
    await render(<GeneratedImagePart part={{ result: { status } }} />);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(GENERATION_COPY[status]);
    await expect.element(page.getByRole("img")).not.toBeInTheDocument();
  },
);
