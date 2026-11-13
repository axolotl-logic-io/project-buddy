import { expect, test } from "vitest";
import { currentSpell, setSpell } from "@/spells/spell-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signedInChat } from "../test-database/chat-test-kit.ts";

test("an owned conversation has one spell, and another user cannot read or change it", async () => {
  const { user, chat } = await signedInChat();
  const other = await testUser();
  expect(await currentSpell(user.id, chat)).toBeUndefined();
  expect(await setSpell(user.id, { chatId: chat.id, spell: "plan" })).toBe(
    true,
  );
  expect(await currentSpell(user.id, chat)).toBe("plan");
  expect(await currentSpell(other.id, chat)).toBeUndefined();
  expect(
    await setSpell(other.id, { chatId: chat.id, spell: "brainstorm" }),
  ).toBe(false);
  expect(await currentSpell(user.id, chat)).toBe("plan");
  expect(await setSpell(user.id, { chatId: chat.id, spell: undefined })).toBe(
    true,
  );
  expect(await currentSpell(user.id, chat)).toBeUndefined();
});
