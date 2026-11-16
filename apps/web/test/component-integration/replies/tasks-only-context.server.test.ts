import { expect, test } from "vitest";
import { chatTools } from "@/replies/tools/index.ts";
import { changeTasks } from "@/tasks/tasks-store.ts";
import {
  constructPrompt,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

test("use_case_ask_whats_next", async () => {
  const { user, chat } = await signedInChat();
  await changeTasks(user.id, { questId: chat.quest.id, author: "person" }, [
    { op: "add", text: "Shape the shell" },
    { op: "add", text: "Add the flippers" },
    { op: "complete", task: 1 },
  ]);
  const prompt = JSON.stringify(await constructPrompt(chat.id));
  expect(prompt).toContain("Shape the shell");
  expect(prompt).toContain("Add the flippers");
  expect(prompt).toContain("<quest_tasks>");
  expect(prompt).not.toContain("<quest_goal>");
  expect(prompt).not.toContain("<quest_preferences>");
  expect(prompt).not.toContain("<quest_memory>");
  expect(Object.keys(chatTools())).toContain("change_tasks");
  for (const tool of ["set_goal", "change_preferences", "update_memory"]) {
    expect(Object.keys(chatTools())).not.toContain(tool);
  }
});
