// A project's milestones in the test database with the mock construct: the
// construct's record_milestone through POST /api/chat, the progress timeline on
// the project's page, and her edits and deletes from it. How the chat and
// the timeline look is milestone-part.browser.test.tsx's and
// progress-timeline.browser.test.tsx's.
import type { UIMessage } from "ai";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import {
  deleteMilestoneAction,
  editMilestoneAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listMessages } from "@/chats/store.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { MILESTONE_TEXT_MAX_LENGTH } from "@/milestones/milestone.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { listProjects } from "@/projects/store.ts";
import {
  RECORD_MILESTONE_OUTPUT,
  RECORD_MILESTONE_TOOL,
} from "@/replies/tools/record-milestone-contract.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import {
  constructPrompt,
  formOf,
  sendChatMessage,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

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
// How many milestones the timeline test records for her.
const TIMELINE_LENGTH = 3;
const CHAT_HREF = /href="(?<href>\/chats\/[^"]+)"/gu;

const OUTPUT_CHUNK = z.object({
  type: z.literal("tool-output-available"),
  output: RECORD_MILESTONE_OUTPUT,
});

function recordCommand(input: unknown): string {
  return `/mock-tool ${RECORD_MILESTONE_TOOL} ${JSON.stringify(input)}`;
}

// The record_milestone parts of the reply saved last in the user's chat.
async function savedCalls(
  owner: UserId,
  chatId: ChatId,
): Promise<UIMessage["parts"]> {
  const reply = (await listMessages(owner, chatId)).at(-1);
  return (reply?.parts ?? []).filter(
    ({ type }) => type === `tool-${RECORD_MILESTONE_TOOL}`,
  );
}

// The project's page, as the signed-in user sees it.
async function pageHtml(projectId: string): Promise<string> {
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

function editForm(milestoneId: string, text: string): FormData {
  return formOf({ milestoneId, text });
}

describe("use_case_construct_records_milestone", () => {
  test("a project chat's milestone is on the project's timeline, linked to the chat, and streamed and saved in the reply", async () => {
    const { user, chat } = await signedInChat();

    const sent = await sendChatMessage(chat.id, recordCommand({ text: SHELL }));

    const [milestone, ...others] = await listMilestones(
      user.id,
      chat.project.id,
    );
    expect(others).toEqual([]);
    expect(milestone).toMatchObject({ chatId: chat.id, text: SHELL });
    const streamed = sent.chunks.flatMap((chunk) => {
      const parsed = OUTPUT_CHUNK.safeParse(chunk);
      if (parsed.success) {
        return [parsed.data.output];
      }
      return [];
    });
    const recorded = {
      status: "recorded",
      milestoneId: milestone?.id,
      projectId: chat.project.id,
      text: SHELL,
      recordedAt: milestone?.recordedAt.toISOString(),
    };
    expect(streamed).toEqual([recorded]);
    expect(await savedCalls(user.id, chat.id)).toEqual([
      expect.objectContaining({ state: "output-available", output: recorded }),
    ]);
  });

  test("another chat in the project gets the milestone in its prompt, so the construct can see it is recorded", async () => {
    const { her: user, herData } = await twoUsers();
    const project = await herData.project();
    const [chat, otherChat] = await Promise.all([
      herData.chat(project),
      herData.chat(project),
    ]);
    const standalone = await createStandaloneChat(user.id);
    await sendChatMessage(chat.id, recordCommand({ text: SHELL }));

    const prompt = await constructPrompt(otherChat.id);
    const standalonePrompt = await constructPrompt(standalone.id);

    const [recorded] = await listMilestones(user.id, chat.project.id);
    const day = recorded?.recordedAt.toISOString().slice(0, DAY_LENGTH);
    expect(prompt).toContain(`- ${day}: ${SHELL}`);
    expect(prompt).toContain("never record any of them again");
    expect(standalonePrompt).not.toContain(SHELL);
  });

  test("a standalone chat records no milestone, and its reply saves the failed call", async () => {
    const { user } = await signedInChat();
    const standalone = await createStandaloneChat(user.id);

    await sendChatMessage(standalone.id, recordCommand({ text: SHELL }));

    expect(await savedCalls(user.id, standalone.id)).toEqual([
      expect.objectContaining({ state: "output-error" }),
    ]);
    const projects = await listProjects(user.id);
    const timelines = await Promise.all(
      projects.map(({ id }) => listMilestones(user.id, id)),
    );
    expect(timelines.flat()).toEqual([]);
  });

  test("a milestone with no text saves the failed call and records nothing", async () => {
    const { user, chat } = await signedInChat();

    await sendChatMessage(chat.id, recordCommand({ text: " " }));

    expect(await savedCalls(user.id, chat.id)).toEqual([
      expect.objectContaining({ state: "output-error" }),
    ]);
    expect(await listMilestones(user.id, chat.project.id)).toEqual([]);
  });
});

describe("use_case_view_progress_timeline", () => {
  test("the project's page lists its milestones newest first, each linking to its chat, and no one else's", async () => {
    const { her, herData, otherData } = await twoUsers();
    const project = await herData.project("Sea turtle model");
    const [first, second] = await Promise.all([
      herData.chat(project),
      herData.chat(project),
    ]);
    const foreignChat = await otherData.chat(await otherData.project());
    await recordMilestone(
      her.id,
      { projectId: project.id, chatId: first.id },
      SHELL,
    );
    await recordMilestone(
      her.id,
      { projectId: project.id, chatId: first.id },
      FLIPPERS,
    );
    await recordMilestone(
      her.id,
      { projectId: project.id, chatId: second.id },
      RETOPO,
    );
    await recordMilestone(
      her.id,
      { projectId: foreignChat.project.id, chatId: foreignChat.id },
      "Not hers to record",
    );

    const html = await pageHtml(project.id);

    const timeline = html.slice(html.indexOf(PROGRESS_TIMELINE_COPY.heading));
    const order = [RETOPO, FLIPPERS, SHELL].map((text) =>
      timeline.indexOf(text),
    );
    expect(order.every((at) => at !== -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toContain("Not hers to record");
    const links = Array.from(
      timeline.matchAll(CHAT_HREF),
      ([, href]) => href ?? "",
    );
    expect(links.slice(0, TIMELINE_LENGTH)).toEqual([
      `/chats/${second.id}`,
      `/chats/${first.id}`,
      `/chats/${first.id}`,
    ]);
  });

  test("with no milestones, the page says how they arrive", async () => {
    const { chat } = await signedInChat();

    expect(await pageHtml(chat.project.id)).toContain(
      PROGRESS_TIMELINE_COPY.none,
    );
  });
});

describe("use_case_edit_milestone", () => {
  test("her edit changes the milestone's text and keeps its date and chat", async () => {
    const { user, chat } = await signedInChat();
    const source = { projectId: chat.project.id, chatId: chat.id };
    const milestone = await recordMilestone(user.id, source, SHELL);

    expect(
      await editMilestoneAction(
        { kind: "idle" },
        editForm(milestone?.id ?? "", `  ${FLIPPERS}  `),
      ),
    ).toEqual({ kind: "saved" });

    expect(await listMilestones(user.id, chat.project.id)).toEqual([
      { ...milestone, text: FLIPPERS },
    ]);
  });

  test("text that is empty, too long or on more than one line is refused, and the milestone kept", async () => {
    const { user, chat } = await signedInChat();
    const source = { projectId: chat.project.id, chatId: chat.id };
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

    expect(await listMilestones(user.id, chat.project.id)).toEqual([milestone]);
  });

  test("she deletes a milestone, and deleting it again changes nothing", async () => {
    const { user, chat } = await signedInChat();
    const source = { projectId: chat.project.id, chatId: chat.id };
    const kept = await recordMilestone(user.id, source, SHELL);
    const deleted = await recordMilestone(user.id, source, FLIPPERS);
    const form = formOf({ milestoneId: deleted?.id ?? "" });

    await deleteMilestoneAction(form);
    await deleteMilestoneAction(form);

    expect(await listMilestones(user.id, chat.project.id)).toEqual([kept]);
  });

  test("another user's milestone is not found to edit, deleting it changes nothing, and a malformed id is not found", async () => {
    const { other, otherData } = await twoUsers();
    const foreignChat = await otherData.chat(await otherData.project());
    const foreign = await recordMilestone(
      other.id,
      { projectId: foreignChat.project.id, chatId: foreignChat.id },
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

    expect(await listMilestones(other.id, foreignChat.project.id)).toEqual([
      foreign,
    ]);
  });
});

test("a milestone is recorded only from a chat in the owner's own project", async () => {
  const { her, herData, otherData } = await twoUsers();
  const herChat = await herData.chat(await herData.project());
  const otherProject = await herData.project();
  const foreignChat = await otherData.chat(await otherData.project());

  const results = await Promise.all([
    recordMilestone(
      her.id,
      { projectId: foreignChat.project.id, chatId: foreignChat.id },
      SHELL,
    ),
    recordMilestone(
      her.id,
      { projectId: otherProject.id, chatId: herChat.id },
      SHELL,
    ),
  ]);

  expect(results).toEqual([undefined, undefined]);
  expect(await listMilestones(her.id, otherProject.id)).toEqual([]);
});
