// The rules for several people in the buddy's system prompt: a chat where
// more than one person has written gets them in its own part of the prompt,
// after where the chat is, and every other chat's prompt is exactly what it
// was, with the shared, cached part unchanged in both.
import { describe, expect, test } from "vitest";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { DEFAULT_BUDDY_ID, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { SEVERAL_AUTHORS_RULES } from "@/replies/global-prompt.ts";
import {
  type ReplyPromptContext,
  renderReplyInstructions,
} from "@/replies/system-prompt.ts";

const CONTEXT: ReplyPromptContext = {
  activities: [],
  spells: [],
  project: undefined,
  buddy: snapshotOf(getBuddy(DEFAULT_BUDDY_ID)),
  activity: builtInActivity(DEFAULT_ACTIVITY_ID),
  userName: "Sam",
};

function contents(context: ReplyPromptContext): string[] {
  return renderReplyInstructions(context).map(({ content }) => content);
}

describe("the rules for several people", () => {
  test("a chat with one author gets the prompt it had before", () => {
    expect(contents({ ...CONTEXT, severalAuthors: false })).toStrictEqual(
      contents(CONTEXT),
    );
    expect(contents(CONTEXT).join("\n")).not.toContain(SEVERAL_AUTHORS_RULES);
  });

  test("a chat with several authors gets them in its own part", () => {
    const [shared, own] = contents({ ...CONTEXT, severalAuthors: true });
    const [sharedBefore] = contents(CONTEXT);

    expect(shared).toBe(sharedBefore);
    expect(own).toContain(SEVERAL_AUTHORS_RULES);
  });
});
