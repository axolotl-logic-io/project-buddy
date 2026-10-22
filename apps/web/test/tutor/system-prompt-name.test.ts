// The user's name in the tutor's system prompt: every {{name}} in the
// buddy's parts becomes it, or "the user" when she has none.
import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type BuddySnapshot, getBuddy } from "@/buddies/index.ts";
import {
  buildTutorInstructions,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";
import { readPromptPreferences } from "../accounts/users-store-test-kit.ts";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "../id-fixtures.ts";
import { OWNER, resetReplyTestKit } from "./reply-test-kit.ts";

vi.mock("@/memory/memory-store.ts", () => import("./reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("../accounts/users-store-test-kit.ts"),
);

const OTHER_OWNER = userIdFixture("9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b");

beforeEach(() => {
  resetReplyTestKit();
  readPromptPreferences.mockReset();
});

// Mr. Tee, with {{name}} in parts of both system messages, some more than
// once.
function namedBuddy(): BuddySnapshot {
  const mrTee = getBuddy("mr-tee");
  return {
    name: mrTee.name,
    parts: {
      ...mrTee.parts,
      role: "You teach {{name}} Blender. {{name}} learns fast.",
      voice: "Hi {{name}}",
      teachingRules: "- Call {{name}} by name.\n- {{name}}, always.",
      emptyMemory: "Nothing saved for {{name}} yet.",
    },
  };
}

// A turn in a new chat of the owner's, in the buddy.
function namedRequest(buddy: BuddySnapshot, owner = OWNER): TutorPromptRequest {
  return {
    owner,
    chat: {
      kind: "project",
      id: chatIdFixture(),
      projectId: projectIdFixture(),
      projectName: "Low-poly fox",
      isInterviewChat: false,
      buddy,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(),
    },
    buddy,
  };
}

function contentOf(message: SystemModelMessage | undefined): string {
  return message?.content ?? "";
}

function promptText(messages: readonly SystemModelMessage[]): string {
  return messages.map(contentOf).join("\n");
}

// Mabel is named; every other owner has no name.
function onlyMabelNamed(
  owner: string,
): ReturnType<typeof readPromptPreferences> {
  if (owner === OWNER) {
    return Promise.resolve({ userName: "Mabel", hiddenExtras: [] });
  }
  return Promise.resolve({ userName: undefined, hiddenExtras: [] });
}

describe("buildTutorInstructions with her name", () => {
  test("puts her name for every {{name}} in the role, voice and teaching rules", async () => {
    readPromptPreferences.mockResolvedValue({
      userName: "Mabel",
      hiddenExtras: [],
    });

    const prompt = await buildTutorInstructions(namedRequest(namedBuddy()));
    const [shared, chat] = prompt;

    expect(readPromptPreferences).toHaveBeenCalledWith(OWNER);
    expect(contentOf(shared)).toContain(
      "You teach Mabel Blender. Mabel learns fast.",
    );
    expect(contentOf(chat)).toContain("Hi Mabel");
    expect(contentOf(chat)).toContain(
      "- Call Mabel by name.\n- Mabel, always.",
    );
    expect(contentOf(chat)).toContain("Nothing saved for Mabel yet.");
    expect(promptText(prompt)).not.toContain("{{name}}");
  });

  test("keeps a $ in her name as she typed it", async () => {
    readPromptPreferences.mockResolvedValue({
      userName: "$& $1 Mabel",
      hiddenExtras: [],
    });

    const [, chat] = await buildTutorInstructions(namedRequest(namedBuddy()));

    expect(contentOf(chat)).toContain("Hi $& $1 Mabel");
  });

  test("leaves other braces as written", async () => {
    readPromptPreferences.mockResolvedValue({
      userName: "Mabel",
      hiddenExtras: [],
    });
    const buddy = namedBuddy();
    const others = {
      ...buddy,
      parts: { ...buddy.parts, voice: "{{ name }} {{project}} {name}" },
    };

    const [, chat] = await buildTutorInstructions(namedRequest(others));

    expect(contentOf(chat)).toContain("{{ name }} {{project}} {name}");
  });

  test("leaves the buddy it was given as written", async () => {
    readPromptPreferences.mockResolvedValue({
      userName: "Mabel",
      hiddenExtras: [],
    });
    const buddy = namedBuddy();

    await buildTutorInstructions(namedRequest(buddy));

    expect(buddy).toEqual(namedBuddy());
  });
});

describe("buildTutorInstructions without her name", () => {
  test("says the user for every {{name}}", async () => {
    const [shared, chat] = await buildTutorInstructions(
      namedRequest(namedBuddy()),
    );

    expect(contentOf(shared)).toContain("You teach the user Blender.");
    expect(contentOf(chat)).toContain("Hi the user");
  });
});

describe("the shared text with her name", () => {
  test("is the same in two of her chats in one buddy", async () => {
    readPromptPreferences.mockResolvedValue({
      userName: "Mabel",
      hiddenExtras: [],
    });
    const buddy = namedBuddy();

    const [first, second] = await Promise.all([
      buildTutorInstructions(namedRequest(buddy)),
      buildTutorInstructions(namedRequest(buddy)),
    ]);

    expect(first[0]).toEqual(second[0]);
    expect(contentOf(first[0])).toContain("Mabel");
  });

  test("never reaches another owner's prompt", async () => {
    readPromptPreferences.mockImplementation(onlyMabelNamed);
    const buddy = namedBuddy();

    const [hers, theirs] = await Promise.all([
      buildTutorInstructions(namedRequest(buddy, OWNER)),
      buildTutorInstructions(namedRequest(buddy, OTHER_OWNER)),
    ]);

    expect(readPromptPreferences).toHaveBeenCalledWith(OTHER_OWNER);
    expect(promptText(hers)).toContain("Hi Mabel");
    expect(promptText(theirs)).toContain("Hi the user");
    expect(promptText(theirs)).not.toContain("Mabel");
  });
});
