import { expect, test } from "vitest";
import { setSpell } from "@/spells/spell-store.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import {
  constructReply,
  messageText,
  signedInChat,
} from "../../../test-database/chat-test-kit.ts";

test("every construct is given the same facts", async () => {
  const { user, chat } = await signedInChat();
  const data = testData(user);
  const quest = await data.quest("Another construct");
  const other = await data.chat(quest, "lumen");
  await setSpell(user.id, { chatId: other.id, spell: "tasks" });
  const replies = await Promise.all([
    constructReply(chat.id, "help"),
    constructReply(other.id, "help"),
  ]);
  expect(messageText(replies[0])).toBe(LOCAL_CONSTRUCT_COPY.help);
  expect(messageText(replies[1])).toBe(messageText(replies[0]));
});
