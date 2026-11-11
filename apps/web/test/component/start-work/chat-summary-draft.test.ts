import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { chatSummaryDraft } from "@/start-work/chat-summary-draft.ts";

// The most a line of the draft keeps, and a message far longer than that.
const LONGEST_LINE = 500;
const LONG_MESSAGE = "x".repeat(LONGEST_LINE * LONGEST_LINE);

function said(role: UIMessage["role"], text: string): UIMessage {
  return { id: crypto.randomUUID(), role, parts: [{ type: "text", text }] };
}

describe("Turn Chat into a quest's draft summary", () => {
  test("quotes only the user's latest messages, oldest first, one line each", () => {
    const messages = [
      said("user", "first"),
      said("assistant", "the construct's words stay out"),
      ...["two", "three", "four", "five", "six\n\nlines"].map((text) =>
        said("user", text),
      ),
    ];

    expect(chatSummaryDraft(messages)).toBe(
      "- two\n- three\n- four\n- five\n- six lines",
    );
  });

  test("is empty before she has said anything, and cuts a long message short", () => {
    expect(chatSummaryDraft([said("assistant", "Hello")])).toBe("");
    const [line] = chatSummaryDraft([said("user", LONG_MESSAGE)]).split("\n");
    expect(line?.length).toBeLessThan(LONGEST_LINE);
    expect(line?.endsWith("…")).toBe(true);
  });
});
