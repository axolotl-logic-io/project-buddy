import { beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import GalleryPage from "@/app/(workspace)/gallery/page.tsx";
import { GeneratedImagePart } from "@/components/chat/generated-image-part.tsx";
import { CHAT_ID } from "@/ids.ts";
import {
  GENERATION_ID,
  generatedImageUrl,
} from "@/images/generation-contract.ts";
import { listGeneratedImages } from "@/images/generation-store.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/images/generation-store.ts", () => ({
  listGeneratedImages: vi.fn(),
}));

const ID = GENERATION_ID.parse("baaf1045-0bcb-4f49-b600-18cfeb6936f4");
const CHAT = CHAT_ID.parse("a5a6ab4b-5f2b-4f1f-8614-76e24198577b");
const IMAGE_RESERVATION_GOLD = 25;
const AVAILABLE_GOLD = 20;
const PROMPT = "A blue bird above a forest";

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
});

describe("image gallery", () => {
  test("use_case_image_gallery", async () => {
    vi.mocked(listGeneratedImages).mockResolvedValue([
      {
        id: ID,
        chatId: CHAT,
        prompt: PROMPT,
        imageUrl: "/api/images/private",
        status: "generated",
        createdAt: new Date(0),
      },
    ]);
    await render(await GalleryPage({ searchParams: Promise.resolve({}) }));
    await expect
      .element(page.getByRole("heading", { name: GENERATION_COPY.heading }))
      .toBeVisible();
    const image = page
      .getByRole("link", { name: GENERATION_COPY.view })
      .element()
      .querySelector("img");
    await expect.element(image).toHaveAttribute("src", generatedImageUrl(ID));
    await expect.element(image).toHaveAttribute("alt", "");
    await expect.element(page.getByText(PROMPT, { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole("img", { name: PROMPT }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: GENERATION_COPY.download }))
      .toHaveAttribute("href", generatedImageUrl(ID, true));
    await expect
      .element(page.getByRole("link", { name: GENERATION_COPY.source }))
      .toHaveAttribute("href", `/chats/${CHAT}`);
    await expect.element(page.getByText(GENERATION_COPY.context)).toBeVisible();
    expect(document.querySelector("time")?.dateTime).toBe(
      new Date(0).toISOString(),
    );
  });

  test("explains how to create the first image", async () => {
    vi.mocked(listGeneratedImages).mockResolvedValue([]);
    await render(await GalleryPage({ searchParams: Promise.resolve({}) }));
    await expect.element(page.getByText(GENERATION_COPY.empty)).toBeVisible();
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
});

test("insufficient image-reservation gold explains the amounts without claiming the balance is zero", async () => {
  await render(
    <GeneratedImagePart
      part={{
        result: {
          status: "outOfGold",
          requiredGold: IMAGE_RESERVATION_GOLD,
          availableGold: AVAILABLE_GOLD,
        },
      }}
    />,
  );
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent(
      GENERATION_COPY.reservationRefused(
        IMAGE_RESERVATION_GOLD,
        AVAILABLE_GOLD,
      ),
    );
  await expect
    .element(page.getByRole("link"))
    .toHaveAttribute("href", "/marketplace#your-listings");
});
