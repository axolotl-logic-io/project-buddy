import { expect, test, vi } from "vitest";
import { readUserName } from "@/accounts/users-store.ts";
import { setNameAction } from "@/app/(workspace)/settings/actions.ts";
import { createSpell } from "@/spells/own-spell-store.ts";
import { setSpell } from "@/spells/spell-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import {
  constructReply,
  messageText,
} from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_set_name", async () => {
  const user = await testUser();
  const other = await testUser();
  const data = testData(user);
  const quest = await data.quest();
  const chat = await data.chat(quest);
  const spell = await createSpell(user.id, {
    name: "Named replies",
    definition: { destination: "brainstorm", savedReply: "Hi {{name}}" },
  });
  await setSpell(user.id, { chatId: chat.id, spell: spell.id });
  await signIn(user);
  const form = new FormData();
  form.set("name", "  Mabel ");
  form.set("userId", other.id);
  expect(await setNameAction({ kind: "idle" }, form)).toEqual({
    kind: "saved",
  });
  expect(await readUserName(user.id)).toBe("Mabel");
  expect(await readUserName(other.id)).toBeUndefined();
  expect(messageText(await constructReply(chat.id, "An idea"))).toBe(
    "Hi Mabel",
  );
  form.set("name", "{x}");
  expect(await setNameAction({ kind: "idle" }, form)).toEqual({
    kind: "invalid",
    message: ACCOUNT_COPY.nameBraces,
  });
  expect(await readUserName(user.id)).toBe("Mabel");
  form.set("name", "");
  expect(await setNameAction({ kind: "idle" }, form)).toEqual({
    kind: "invalid",
    message: ACCOUNT_COPY.nameRequired,
  });
  expect(messageText(await constructReply(chat.id, "Another idea"))).toBe(
    "Hi Mabel",
  );
});
