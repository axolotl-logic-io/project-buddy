// The exp command in a quest's conversation: the construct answers it with
// the sender's experience, circle and title, and an active spell never saves
// it.

import { expect, test } from "vitest";
import { readTasks } from "@/tasks/tasks-store.ts";
import {
  constructReply,
  messageText,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

const ONE_TASK_ADDED = [
  "**Circle 1 · Initiate**",
  "",
  "1 experience. 4 more to reach circle 2.",
  "",
  "- Adding tasks: 1 point",
  "- Ideating: 0 points",
  "- Quick Notes: 0 points",
  "- Completing tasks: 0 points",
  "- Completing quests: 0 points",
].join("\n");

test("use_case_experience_command", async () => {
  const { user, chat } = await signedInChat();
  await constructReply(chat.id, "/tasks");
  await constructReply(chat.id, "Buy clay");
  expect(messageText(await constructReply(chat.id, "exp"))).toBe(
    ONE_TASK_ADDED,
  );
  expect(messageText(await constructReply(chat.id, "/EXP"))).toBe(
    ONE_TASK_ADDED,
  );
  expect(
    (await readTasks(user.id, chat.quest.id))?.items.map((task) => task.text),
  ).toEqual(["Buy clay"]);
});
