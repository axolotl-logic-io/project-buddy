// The construct's system prompt: the rules for several people go in the chat's
// own part, after where the chat is, in a chat where more than one person
// has written, and every other chat's prompt is exactly what it was, with
// the shared, cached part unchanged in both. The user's spells go in the
// shared, cached part, one line each, with {{name}} as the user's name.

import { describe, expect, test } from "vitest";
import {
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
  snapshotOf,
} from "@/constructs/index.ts";
import { SEVERAL_AUTHORS_RULES } from "@/replies/global-prompt.ts";
import {
  type ReplyPromptContext,
  renderReplyInstructions,
} from "@/replies/system-prompt.ts";

const CONTEXT: ReplyPromptContext = {
  quest: undefined,
  construct: snapshotOf(getConstruct(DEFAULT_CONSTRUCT_ID)),
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

test("the prompt offers only the two spells and names the active one", () => {
  const [shared, own] = contents({ ...CONTEXT, spell: "brainstorm" });
  expect(shared).toContain("`plan`: Plan");
  expect(shared).toContain("`brainstorm`: Brainstorm");
  expect(shared).not.toContain("# Activities");
  expect(own).toContain("Active spell: Brainstorm");
  expect(contents(CONTEXT)[1]).toContain("No spell is active.");
});

test("quest context includes the plan while unrelated requests take precedence", () => {
  const prompt = contents({
    ...CONTEXT,
    spell: "brainstorm",
    quest: {
      name: "Birdhouse",
      plan: {
        steps: [{ number: 1, text: "Assemble the roof.", done: false }],
        nextNumber: 2,
      },
      milestones: [],
    },
  }).join("\n");
  expect(prompt).toContain(
    "without appending quest reminders, next steps or a return-to-quest question",
  );
  expect(prompt).toContain("Assemble the roof.");
});

test("shared instructions prohibit assumed pronouns", () => {
  const prompt = contents(CONTEXT).join("\n");
  expect(prompt).toContain(
    "Do not infer a person’s gender or pronouns from their name",
  );
});

test("plan rules use the saved step numbers", () => {
  const prompt = contents(CONTEXT).join("\n");
  expect(prompt).toContain("Name a step by its number in the plan, such as #3");
  expect(prompt).toContain(
    "Never number the plan's steps yourself or restate the plan as a list",
  );
});
