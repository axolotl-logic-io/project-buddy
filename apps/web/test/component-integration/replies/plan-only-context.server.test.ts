import { expect, test } from "vitest";
import { changePlan } from "@/plan/plan-store.ts";
import { chatTools } from "@/replies/tools/index.ts";
import {
  constructPrompt,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

test("use_case_ask_whats_next", async () => {
  const { user, chat } = await signedInChat();
  await changePlan(user.id, { questId: chat.quest.id, author: "person" }, [
    { op: "add", text: "Shape the shell" },
    { op: "add", text: "Add the flippers" },
    { op: "complete", step: 1 },
  ]);
  const prompt = JSON.stringify(await constructPrompt(chat.id));
  expect(prompt).toContain("Shape the shell");
  expect(prompt).toContain("Add the flippers");
  expect(prompt).toContain("<quest_plan>");
  expect(prompt).not.toContain("<quest_goal>");
  expect(prompt).not.toContain("<quest_preferences>");
  expect(prompt).not.toContain("<quest_memory>");
  expect(Object.keys(chatTools(chat.quest.id))).toContain("change_plan");
  for (const tool of ["set_goal", "change_preferences", "update_memory"]) {
    expect(Object.keys(chatTools(chat.quest.id))).not.toContain(tool);
  }
});
