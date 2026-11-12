// Chat in use-cases/chats.md, in the test database with the mock construct:
// no quest, just a place to talk ideas through. Opening Chat and its old
// addresses are app/(workspace)/chat/page.server.test.ts's.

import type { UIMessage } from "ai";
import { expect, test } from "vitest";
import {
  CITE_BLENDER_MANUAL_OUTPUT,
  CITE_BLENDER_MANUAL_TOOL,
} from "@/blender-manual/cite-tool-contract.ts";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { listQuests } from "@/quests/store.ts";
import {
  manualSection,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { spendAllGold } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  postMessage,
  question,
  sendToEnd,
} from "../test-database/chat-test-kit.ts";

// A word in no manual section but the one this file adds, so a search finds
// it and the reply cites it.
const TOPIC = "quibblewand";
const QUIBBLEWAND = manualSection(
  "modeling/meshes/editing/edge/quibblewand",
  "quibblewand-edges",
  "Quibblewand Edges",
  "Press Ctrl-Shift-Q to quibblewand the selected edges.",
);
const OUT_OF_GOLD = "And then what?";
// Her idea and its reply, then her search and its answer.
const MESSAGES_BEFORE_OUT_OF_GOLD = 2;
const CITE_MANUAL_PART = `tool-${CITE_BLENDER_MANUAL_TOOL}`;

// The URLs the message's citation parts cite, in order.
function citedUrls(message: UIMessage | undefined): string[] {
  return (message?.parts ?? []).flatMap((part) => {
    if (part.type !== CITE_MANUAL_PART || !("output" in part)) {
      return [];
    }
    return CITE_BLENDER_MANUAL_OUTPUT.parse(part.output).citations.map(
      ({ url }) => url,
    );
  });
}

test("use_case_talk_idea_through", async () => {
  const user = await testUser();
  const data = testData(user);
  const quest = await data.quest();
  await data.manualSections([QUIBBLEWAND]);
  const standalone = await privateChat(user.id);

  await sendToEnd(user, standalone, `/mock-search ${TOPIC}`);
  const answer = (await listMessages(user.id, standalone.id)).at(-1);
  expect(citedUrls(answer)).toEqual([QUIBBLEWAND.url]);

  expect((await listQuests(user.id)).map(({ id }) => id)).toEqual([quest.id]);

  await spendAllGold(user);
  const refused = await postMessage(user, standalone, question(OUT_OF_GOLD));
  expect(refused.status).toBe(HTTP_STATUS.tooManyRequests);
  expect(readAppErrorCase(await refused.text())).toBe("out-of-gold");
  expect(await listMessages(user.id, standalone.id)).toHaveLength(
    MESSAGES_BEFORE_OUT_OF_GOLD,
  );
});
