// Standalone conversations in use-cases/chats.md, in the test database
// with the mock buddy: no project, just a place to talk ideas through.
// Its links, heading and view are the page and component tests'
// (test/app/page.test.tsx, site-header.test.tsx, chat/page.test.tsx and
// chat-view-*.test.tsx).
import type { UIMessage } from "ai";
import { expect, test } from "vitest";
import {
  CITE_BLENDER_MANUAL_OUTPUT,
  CITE_BLENDER_MANUAL_TOOL,
} from "@/blender-manual/cite-tool-contract.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listChats, listMessages } from "@/chats/store.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { editMemory, readMemory } from "@/memory/memory-store.ts";
import { listProjects } from "@/projects/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import {
  manualSection,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { spend } from "../../support/test-database/spend-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  exchange,
  postMessage,
  question,
  savedConversation,
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
const FIRST_MESSAGE = "How do I bevel an edge?";
const OVER_QUOTA = "And then what?";
// Her idea and its reply, then her search and its answer.
const MESSAGES_BEFORE_QUOTA = 2;
const CITE_MANUAL_PART = `tool-${CITE_BLENDER_MANUAL_TOOL}`;
const LINE_BREAK = "\n";

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

test("use_case_standalone_chat", async () => {
  const user = await testUser();
  const data = testData(user);
  const project = await data.project();
  const projectChat = await data.chat(project);

  const standalone = await createStandaloneChat(user.id);
  expect((await createStandaloneChat(user.id)).id).not.toBe(standalone.id);
  await sendToEnd(user, standalone, FIRST_MESSAGE);

  expect(await savedConversation(user, standalone)).toEqual(
    exchange(FIRST_MESSAGE),
  );
  expect((await listChats(user.id, project.id)).map(({ id }) => id)).toEqual([
    projectChat.id,
  ]);
});

test("use_case_talk_idea_through", async () => {
  const user = await testUser();
  const data = testData(user);
  const project = await data.project();
  await editMemory(user.id, {
    projectId: project.id,
    edit: { oldText: "", newText: "- [ ] Bevel the donut" },
    author: "user",
  });
  const memory = await readMemory(user.id, project.id);
  await data.manualSections([QUIBBLEWAND]);
  const standalone = await createStandaloneChat(user.id);

  await sendToEnd(user, standalone, `/mock-search ${TOPIC}`);
  const answer = (await listMessages(user.id, standalone.id)).at(-1);
  expect(citedUrls(answer)).toEqual([QUIBBLEWAND.url]);

  expect((await listProjects(user.id)).map(({ id }) => id)).toEqual([
    project.id,
  ]);
  expect(await readMemory(user.id, project.id)).toEqual(memory);

  await spend(user, MONTHLY_QUOTA_MICRO_USD);
  const refused = await postMessage(user, standalone, question(OVER_QUOTA));
  expect(refused.status).toBe(HTTP_STATUS.tooManyRequests);
  const [refusal] = (await refused.text()).split(LINE_BREAK);
  expect(readAppErrorCase(refusal)).toBe("quota-used-up");
  expect(await listMessages(user.id, standalone.id)).toHaveLength(
    MESSAGES_BEFORE_QUOTA,
  );
});
