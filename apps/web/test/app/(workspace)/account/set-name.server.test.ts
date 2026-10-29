// "use_case_set_name" in use-cases/accounts.md: she sets the name the buddy
// calls her, which fills every {{name}} in her buddy's system prompt, and
// clears it again. The prompt is built as a reply builds it (reply.ts). The
// field and its status are checked in name-form.test.tsx.
import { expect, test, vi } from "vitest";
import { readUserName, type User } from "@/accounts/users-store.ts";
import {
  type SetNameResult,
  setNameAction,
} from "@/app/(workspace)/account/actions.ts";
import { cloneBuddy, updateBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { getChat } from "@/chats/store.ts";
import { buildReplyInstructions } from "@/replies/system-prompt.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { testData } from "../../../test-database/data-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import { testUser } from "../../../test-database/user-test-kit.ts";

// The action refreshes the page, which a server test has none of.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const MR_TEE = getBuddy("mr-tee");
const VOICE = "Hi {{name}}";

// A chat in a new project of user's, in a clone of Mr. Tee whose voice is
// VOICE, made straight in the stores.
async function chatInNamedClone(user: User): Promise<Chat> {
  const clone = await cloneBuddy(user.id, "mr-tee");
  if (clone === undefined) {
    throw new Error("Mr. Tee could not be cloned");
  }
  const parts = { ...clone.parts, voice: VOICE };
  await updateBuddy(user.id, clone.id, { parts });
  const project = await testData(user).project();
  return createChat(user.id, {
    projectId: project.id,
    buddy: { id: MR_TEE.id, name: clone.name, parts },
  });
}

// The buddy's system prompt in owner's chat, as a reply in it builds it.
async function promptIn(owner: User, { id }: Chat): Promise<string> {
  const chat = await getChat(owner.id, id);
  if (chat === undefined) {
    throw new Error("The chat could not be found");
  }
  const instructions = await buildReplyInstructions({
    owner: owner.id,
    chat,
    buddy: chat.buddy,
  });
  return instructions.map(({ content }) => content).join("\n");
}

// Saves name from her account page's name form, as the signed-in user.
function saveName(name: string, forgedUser?: User): Promise<SetNameResult> {
  const form = new FormData();
  form.set("name", name);
  if (forgedUser !== undefined) {
    form.set("userId", forgedUser.id);
    form.set("id", forgedUser.id);
  }
  return setNameAction({ kind: "idle" }, form);
}

test("use_case_set_name", async () => {
  const [her, other] = await Promise.all([testUser(), testUser()]);
  const [hers, theirs] = await Promise.all([
    chatInNamedClone(her),
    chatInNamedClone(other),
  ]);
  await signIn(her);

  expect(await saveName("  Mabel ", other)).toStrictEqual({ kind: "saved" });
  expect(await readUserName(her.id)).toBe("Mabel");
  expect(await readUserName(other.id)).toBeUndefined();
  const named = await promptIn(her, hers);
  expect(named).toContain("Hi Mabel");
  expect(named).not.toContain("{{name}}");

  const theirPrompt = await promptIn(other, theirs);
  expect(theirPrompt).toContain("Hi the user");
  expect(theirPrompt).not.toContain("Mabel");

  expect(await saveName("{x}")).toStrictEqual({
    kind: "invalid",
    message: ACCOUNT_COPY.nameBraces,
  });
  expect(await readUserName(her.id)).toBe("Mabel");

  expect(await saveName("")).toStrictEqual({ kind: "saved" });
  const cleared = await promptIn(her, hers);
  expect(cleared).toContain("Hi the user");
  expect(cleared).not.toContain("Mabel");
});
