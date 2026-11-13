import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";
import { pngBytes } from "../../../support/images/image-fixtures.ts";

vi.mock("next/navigation", () => import("../router-test-kit.ts"));
const IMAGE_URL = "/api/images/00000000-0000-4000-8000-000000000001";
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use_case_chat_images", () => {
  test("the composer has no uploads and pasting or dropping images sends no request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    const view = await render(
      <ChatView
        viewer={userIdFixture()}
        chatId={chatIdFixture()}
        initialMessages={[]}
        constructName="Vellum"
      />,
    );
    await expect
      .element(page.getByRole("button", { name: IMAGE_COPY.add }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByText(IMAGE_COPY.limits))
      .not.toBeInTheDocument();
    expect(
      Array.from(view.container.querySelectorAll("input")).filter(
        (input) => input.type === "file",
      ),
    ).toEqual([]);
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    await box.fill("Keep my question");
    const clipboardData = new DataTransfer();
    clipboardData.items.add(
      new File([pngBytes()], "pixel.png", { type: "image/png" }),
    );
    box.element().dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
    box.element().dispatchEvent(
      new DragEvent("drop", {
        dataTransfer: clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
    await expect.element(box).toHaveValue("Keep my question");
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  test("saved message images remain visible when reopened", async () => {
    await render(
      <ChatView
        viewer={userIdFixture()}
        chatId={chatIdFixture()}
        constructName="Vellum"
        initialMessages={[
          {
            id: "saved",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "image/png",
                url: IMAGE_URL,
                filename: "pixel.png",
              },
            ],
          },
        ]}
      />,
    );
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
  });
});
