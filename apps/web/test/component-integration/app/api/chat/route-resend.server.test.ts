import { expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { goldSpent } from "../../../../support/test-database/gold-test-kit.ts";
import { afterTasksDone } from "../../../test-database/after-test-kit.ts";
import {
  postMessage,
  question,
  userWithChat,
} from "../../../test-database/chat-test-kit.ts";

test("a replayed message gets 409 without a duplicate reply or charge", async () => {
  const { user, chat } = await userWithChat();
  const message = question("help");
  const first = await postMessage(user, chat, message);
  expect(first.status).toBe(HTTP_STATUS.ok);
  await first.text();
  await afterTasksDone();
  const before = await listMessages(user.id, chat.id);
  const again = await postMessage(user, chat, message);
  expect(again.status).toBe(HTTP_STATUS.conflict);
  expect(await again.text()).toBe("already-answered");
  expect(await listMessages(user.id, chat.id)).toEqual(before);
  expect(await goldSpent(user)).toBe(0);
});
