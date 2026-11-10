// "use_case_construct_updates_memory" in use-cases/memory.md, in Chromium and
// WebKit: a reopened adventure whose saved reply changed the Journal shows
// the text removed and the text added as the Journal shows it, formatted
// from its Markdown, with its "#" headings at level 4, under the page's own,
// so the Journal's "##" sections are at level 5. What the reply
// streams and saves is the server tests'.
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { getConstruct } from "@/constructs/index.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const OLD_TEXT = "## Goal\nMake an owl.";
const NEW_TEXT =
  "## Goal\nSculpt a **brass owl**.\n\n### Limits\n- Twenty minutes a day\n- Only the tools on the bench";

describe("use_case_construct_updates_memory", () => {
  test("a Journal change shows each side as the Journal does, not as raw Markdown", async () => {
    await render(
      <ChatView
        viewer={userIdFixture()}
        constructName={getConstruct("vellum").name}
        chatId={chatIdFixture()}
        initialMessages={[
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "Note my goal, please." }],
          },
          {
            id: "r1",
            role: "assistant",
            parts: [
              {
                type: "tool-update_memory",
                toolCallId: "call-1",
                state: "output-available",
                input: { oldText: OLD_TEXT, newText: NEW_TEXT },
                output: {
                  status: "updated",
                  version: 2,
                  oldText: OLD_TEXT,
                  newText: NEW_TEXT,
                },
              },
              { type: "text", text: "Noted." },
            ],
          },
        ]}
      />,
    );

    const change = page.getByRole("complementary", {
      name: MEMORY_COPY.changeLabel,
    });
    await expect
      .element(change.getByRole("deletion"))
      .toHaveTextContent("GoalMake an owl.");
    await expect
      .element(
        change.getByRole("deletion").getByRole("heading", {
          level: 5,
          name: "Goal",
        }),
      )
      .toBeVisible();
    const added = change.getByRole("insertion");
    await expect
      .element(added.getByRole("heading", { level: 5, name: "Goal" }))
      .toBeVisible();
    await expect
      .element(added.getByRole("heading", { level: 6, name: "Limits" }))
      .toBeVisible();
    await expect
      .element(added.getByRole("listitem").nth(1))
      .toHaveTextContent("Only the tools on the bench");
    await expect.element(added.getByText("brass owl")).toBeVisible();
    expect(change.element().textContent).not.toContain("#");
    expect(change.element().textContent).not.toContain("**");
  });
});
