// The user's name in the tutor's system prompt: every {{name}} in the
// persona's parts becomes it, or "the user" when she has none.
import type { SystemModelMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { readUserName } from "@/accounts/users-store-test-kit.ts";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { getPersona, type PersonaSnapshot } from "@/personas/index.ts";
import { OWNER, resetReplyTestKit } from "@/tutor/reply-test-kit.ts";
import {
  buildTutorInstructions,
  renderTutorInstructions,
  type TutorPromptRequest,
} from "@/tutor/system-prompt.ts";

vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("@/accounts/users-store-test-kit.ts"),
);

const OTHER_OWNER = userIdFixture("9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b");

beforeEach(() => {
  resetReplyTestKit();
  readUserName.mockReset();
});

// Mr. Tee, with {{name}} in parts of both system messages, some more than
// once.
function namedPersona(): PersonaSnapshot {
  const mrTee = getPersona("mr-tee");
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

// A turn in a new chat of the owner's, in the persona.
function namedRequest(
  persona: PersonaSnapshot,
  owner = OWNER,
): TutorPromptRequest {
  return {
    owner,
    chat: {
      id: chatIdFixture(),
      projectId: projectIdFixture(),
      projectName: "Low-poly fox",
      isInterviewChat: false,
      persona,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(),
    },
    persona,
  };
}

function contentOf(message: SystemModelMessage | undefined): string {
  return message?.content ?? "";
}

function promptText(messages: readonly SystemModelMessage[]): string {
  return messages.map(contentOf).join("\n");
}

// Mabel is named; every other owner has no name.
function onlyMabelNamed(owner: string): Promise<string | undefined> {
  if (owner === OWNER) {
    return Promise.resolve("Mabel");
  }
  return Promise.resolve(undefined);
}

describe("buildTutorInstructions with her name", () => {
  test("puts her name for every {{name}} in the role, voice and teaching rules", async () => {
    readUserName.mockResolvedValue("Mabel");

    const prompt = await buildTutorInstructions(namedRequest(namedPersona()));
    const [shared, chat] = prompt;

    expect(readUserName).toHaveBeenCalledWith(OWNER);
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
    readUserName.mockResolvedValue("$& $1 Mabel");

    const [, chat] = await buildTutorInstructions(namedRequest(namedPersona()));

    expect(contentOf(chat)).toContain("Hi $& $1 Mabel");
  });

  test("leaves other braces as written", async () => {
    readUserName.mockResolvedValue("Mabel");
    const persona = namedPersona();
    const others = {
      ...persona,
      parts: { ...persona.parts, voice: "{{ name }} {{project}} {name}" },
    };

    const [, chat] = await buildTutorInstructions(namedRequest(others));

    expect(contentOf(chat)).toContain("{{ name }} {{project}} {name}");
  });

  test("leaves the persona it was given as written", async () => {
    readUserName.mockResolvedValue("Mabel");
    const persona = namedPersona();

    await buildTutorInstructions(namedRequest(persona));

    expect(persona).toEqual(namedPersona());
  });
});

describe("buildTutorInstructions without her name", () => {
  test("says the user for every {{name}}", async () => {
    const [shared, chat] = await buildTutorInstructions(
      namedRequest(namedPersona()),
    );

    expect(contentOf(shared)).toContain("You teach the user Blender.");
    expect(contentOf(chat)).toContain("Hi the user");
  });
});

describe("the shared text with her name", () => {
  test("is the same in two of her chats in one persona", async () => {
    readUserName.mockResolvedValue("Mabel");
    const persona = namedPersona();

    const [first, second] = await Promise.all([
      buildTutorInstructions(namedRequest(persona)),
      buildTutorInstructions(namedRequest(persona)),
    ]);

    expect(first[0]).toEqual(second[0]);
    expect(contentOf(first[0])).toContain("Mabel");
  });

  test("never reaches another owner's prompt", async () => {
    readUserName.mockImplementation(onlyMabelNamed);
    const persona = namedPersona();

    const [hers, theirs] = await Promise.all([
      buildTutorInstructions(namedRequest(persona, OWNER)),
      buildTutorInstructions(namedRequest(persona, OTHER_OWNER)),
    ]);

    expect(readUserName).toHaveBeenCalledWith(OTHER_OWNER);
    expect(promptText(hers)).toContain("Hi Mabel");
    expect(promptText(theirs)).toContain("Hi the user");
    expect(promptText(theirs)).not.toContain("Mabel");
  });
});

describe("renderTutorInstructions with a name", () => {
  test("puts the name it is given for {{name}}", () => {
    const [, chat] = renderTutorInstructions({
      projectName: "Low-poly fox",
      isInterviewChat: false,
      persona: namedPersona(),
      memory: EMPTY_MEMORY,
      userName: "Mabel",
    });

    expect(contentOf(chat)).toContain("Hi Mabel");
  });
});
