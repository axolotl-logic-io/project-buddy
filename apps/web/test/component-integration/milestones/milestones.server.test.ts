// A quest's milestones in the test database with the mock construct: the
// construct's record_milestone through POST /api/chat, the progress timeline on
// the quest's page, and her edits and deletes from it. How the chat and
// the timeline look is milestone-part.browser.test.tsx's and
// progress-timeline.browser.test.tsx's.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import {
  deleteMilestoneAction,
  editMilestoneAction,
} from "@/app/(workspace)/quests/[questId]/(overview)/actions.ts";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { privateChat } from "@/conversations/private-chat.ts";
import { MILESTONE_TEXT_MAX_LENGTH } from "@/milestones/milestone.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { recordMilestoneTool } from "@/replies/tools/record-milestone.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import {
  constructPrompt,
  formOf,
  newMessageId,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

// Progress shares the page with the conversation, whose refresh hook needs
// an App Router. Keep the real navigation errors used by the access checks.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  ...(await import("../components/router-test-kit.ts")),
}));

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

const SHELL = "Blocked out the shell and body";
const FLIPPERS = "Fixed the flipper edge loops";
const RETOPO = "Started the retopo pass";
// The length of a day as the prompt writes it, YYYY-MM-DD.
const DAY_LENGTH = 10;

// The quest's page, as the signed-in user sees it.
async function pageHtml(questId: string): Promise<string> {
  return renderToStaticMarkup(
    await QuestPage({
      params: Promise.resolve({ questId }),
      searchParams: Promise.resolve({ section: "progress" }),
    }),
  );
}

function editForm(milestoneId: string, text: string): FormData {
  return formOf({ milestoneId, text });
}

describe("use_case_construct_records_milestone", () => {
  test("the milestone tool records a result linked to its owned conversation", async () => {
    const { user, chat } = await signedInChat();
    const recorded = await Promise.resolve(
      recordMilestoneTool.execute?.(
        { text: SHELL },
        {
          toolCallId: "milestone",
          messages: [],
          context: {
            construct: chat.construct,
            answeredId: newMessageId(),
            actingUser: user.id,
            chatId: chat.id,
            questId: chat.quest.id,
          },
        },
      ),
    );
    expect(recorded).toMatchObject({
      status: "recorded",
      questId: chat.quest.id,
      text: SHELL,
    });
    expect(await listMilestones(user.id, chat.quest.id)).toMatchObject([
      { chatId: chat.id, text: SHELL },
    ]);
  });

  test("the conversation's next reply gets the milestone in its prompt, so the construct can see it is recorded", async () => {
    const { her: user, herData } = await twoUsers();
    const chat = await herData.chat(await herData.quest());
    const standalone = await privateChat(user.id);
    await recordMilestone(
      user.id,
      { questId: chat.quest.id, chatId: chat.id },
      SHELL,
    );

    const prompt = await constructPrompt(chat.id);
    const standalonePrompt = await constructPrompt(standalone.id);

    const [recorded] = await listMilestones(user.id, chat.quest.id);
    const day = recorded?.recordedAt.toISOString().slice(0, DAY_LENGTH);
    expect(prompt).toContain(`- ${day}: ${SHELL}`);
    expect(prompt).toContain("never record any of them again");
    expect(standalonePrompt).not.toContain(SHELL);
  });

  test("a standalone conversation cannot use the milestone tool", async () => {
    const { user } = await signedInChat();
    const chat = await privateChat(user.id);
    await expect(
      recordMilestoneTool.execute?.(
        { text: SHELL },
        {
          toolCallId: "milestone",
          messages: [],
          context: {
            construct: chat.construct,
            answeredId: newMessageId(),
            actingUser: user.id,
            chatId: chat.id,
          },
        },
      ),
    ).rejects.toThrow();
  });
});

describe("use_case_view_progress_timeline", () => {
  test("the quest's Progress lists its milestones newest first, and no one else's", async () => {
    const { her, herData, otherData } = await twoUsers();
    const quest = await herData.quest("Sea turtle model");
    const conversation = await herData.chat(quest);
    const foreignChat = await otherData.chat(await otherData.quest());
    await recordMilestone(
      her.id,
      { questId: quest.id, chatId: conversation.id },
      SHELL,
    );
    await recordMilestone(
      her.id,
      { questId: quest.id, chatId: conversation.id },
      FLIPPERS,
    );
    await recordMilestone(
      her.id,
      { questId: quest.id, chatId: conversation.id },
      RETOPO,
    );
    await recordMilestone(
      her.id,
      { questId: foreignChat.quest.id, chatId: foreignChat.id },
      "Not hers to record",
    );

    const html = await pageHtml(quest.id);

    const timeline = html.slice(html.indexOf(PROGRESS_TIMELINE_COPY.heading));
    const order = [RETOPO, FLIPPERS, SHELL].map((text) =>
      timeline.indexOf(text),
    );
    expect(order.every((at) => at !== -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toContain("Not hers to record");
  });

  test("with no milestones, the page says how they arrive", async () => {
    const { chat } = await signedInChat();

    expect(await pageHtml(chat.quest.id)).toContain(
      PROGRESS_TIMELINE_COPY.none,
    );
  });
});

describe("use_case_edit_milestone", () => {
  test("her edit changes the milestone's text and keeps its date and chat", async () => {
    const { user, chat } = await signedInChat();
    const source = { questId: chat.quest.id, chatId: chat.id };
    const milestone = await recordMilestone(user.id, source, SHELL);

    expect(
      await editMilestoneAction(
        { kind: "idle" },
        editForm(milestone?.id ?? "", `  ${FLIPPERS}  `),
      ),
    ).toEqual({ kind: "saved" });

    expect(await listMilestones(user.id, chat.quest.id)).toEqual([
      { ...milestone, text: FLIPPERS },
    ]);
  });

  test("text that is empty, too long or on more than one line is refused, and the milestone kept", async () => {
    const { user, chat } = await signedInChat();
    const source = { questId: chat.quest.id, chatId: chat.id };
    const milestone = await recordMilestone(user.id, source, SHELL);
    const id = milestone?.id ?? "";

    expect(
      await editMilestoneAction({ kind: "idle" }, editForm(id, " ")),
    ).toEqual({ kind: "invalid", message: PROGRESS_TIMELINE_COPY.needsText });
    const tooLong = PROGRESS_TIMELINE_COPY.tooLong(MILESTONE_TEXT_MAX_LENGTH);
    expect(
      await editMilestoneAction(
        { kind: "idle" },
        editForm(id, "x".repeat(MILESTONE_TEXT_MAX_LENGTH + 1)),
      ),
    ).toEqual({ kind: "invalid", message: tooLong });
    expect(
      await editMilestoneAction(
        { kind: "idle" },
        editForm(id, `${SHELL}\n${FLIPPERS}`),
      ),
    ).toEqual({ kind: "invalid", message: tooLong });

    expect(await listMilestones(user.id, chat.quest.id)).toEqual([milestone]);
  });

  test("she deletes a milestone, and deleting it again changes nothing", async () => {
    const { user, chat } = await signedInChat();
    const source = { questId: chat.quest.id, chatId: chat.id };
    const kept = await recordMilestone(user.id, source, SHELL);
    const deleted = await recordMilestone(user.id, source, FLIPPERS);
    const form = formOf({ milestoneId: deleted?.id ?? "" });

    await deleteMilestoneAction(form);
    await deleteMilestoneAction(form);

    expect(await listMilestones(user.id, chat.quest.id)).toEqual([kept]);
  });

  test("another user's milestone is not found to edit, deleting it changes nothing, and a malformed id is not found", async () => {
    const { other, otherData } = await twoUsers();
    const foreignChat = await otherData.chat(await otherData.quest());
    const foreign = await recordMilestone(
      other.id,
      { questId: foreignChat.quest.id, chatId: foreignChat.id },
      SHELL,
    );
    const foreignId = foreign?.id ?? "";

    await expectNotFound(() =>
      editMilestoneAction({ kind: "idle" }, editForm(foreignId, FLIPPERS)),
    );
    await deleteMilestoneAction(formOf({ milestoneId: foreignId }));
    await expectNotFound(() =>
      editMilestoneAction({ kind: "idle" }, editForm("not-an-id", FLIPPERS)),
    );

    expect(await listMilestones(other.id, foreignChat.quest.id)).toEqual([
      foreign,
    ]);
  });
});

test("a milestone is recorded only from a chat in the owner's own project", async () => {
  const { her, herData, otherData } = await twoUsers();
  const herChat = await herData.chat(await herData.quest());
  const otherQuest = await herData.quest();
  const foreignChat = await otherData.chat(await otherData.quest());

  const results = await Promise.all([
    recordMilestone(
      her.id,
      { questId: foreignChat.quest.id, chatId: foreignChat.id },
      SHELL,
    ),
    recordMilestone(
      her.id,
      { questId: otherQuest.id, chatId: herChat.id },
      SHELL,
    ),
  ]);

  expect(results).toEqual([undefined, undefined]);
  expect(await listMilestones(her.id, otherQuest.id)).toEqual([]);
});
