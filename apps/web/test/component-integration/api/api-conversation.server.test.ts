import { describe, expect, test, vi } from "vitest";
import { POST as sendMessage } from "@/app/api/v1/quests/[questId]/conversation/messages/route.ts";
import { GET as getConversation } from "@/app/api/v1/quests/[questId]/conversation/route.ts";
import {
  PUT as castSpell,
  DELETE as stopSpell,
} from "@/app/api/v1/quests/[questId]/conversation/spell/route.ts";
import { GET as getQuest } from "@/app/api/v1/quests/[questId]/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";
import { callApi, dataOf } from "./api-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

describe("use_case_cli_api_conversation", () => {
  test("a sent message waits for the construct's reply, which the conversation then shows", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest();
    await signIn(her);
    const params = { questId: quest.id };

    const none = await callApi(getConversation, { params });
    expect(none).toMatchObject({
      status: HTTP_STATUS.notFound,
      body: { error: { code: "not_found" } },
    });

    const refused = await callApi(sendMessage, {
      params,
      body: { text: "An idea" },
    });
    expect(refused).toMatchObject({
      status: HTTP_STATUS.forbidden,
      body: { error: { code: "spell_required" } },
    });
    expect((await callApi(getConversation, { params })).status).toBe(
      HTTP_STATUS.notFound,
    );
    await callApi(castSpell, {
      params,
      method: "PUT",
      body: { spell: "brainstorm" },
    });
    const answered = await callApi(sendMessage, {
      params,
      body: { text: "help" },
    });
    await afterTasksDone();
    expect(answered.status).toBe(HTTP_STATUS.ok);
    expect(dataOf(answered)).toMatchObject({
      state: "completed",
      message: { role: "user", text: "help" },
      reply: {
        role: "assistant",
        author: null,
        text: LOCAL_CONSTRUCT_COPY.help,
      },
    });

    const { conversationId } = dataOf(answered);
    const conversation = dataOf(await callApi(getConversation, { params }));
    expect(conversation).toMatchObject({
      id: conversationId,
      activeSpell: { id: "brainstorm" },
      awaitingReply: false,
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", text: "help" }),
        expect.objectContaining({ text: LOCAL_CONSTRUCT_COPY.help }),
      ]),
    });

    const empty = await callApi(sendMessage, { params, body: { text: " " } });
    expect(empty).toMatchObject({
      status: HTTP_STATUS.badRequest,
      body: { error: { code: "invalid_input", field: "text" } },
    });
  });

  test("a spell is cast and stopped in the quest's conversation", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest();
    await signIn(her);
    const params = { questId: quest.id };

    const cast = await callApi(castSpell, {
      params,
      method: "PUT",
      body: { spell: "brainstorm" },
    });
    expect(dataOf(cast)).toMatchObject({
      activeSpell: { id: "brainstorm", destination: "brainstorm" },
    });
    expect(dataOf(await callApi(getConversation, { params }))).toMatchObject({
      activeSpell: { id: "brainstorm" },
    });
    const unknown = await callApi(castSpell, {
      params,
      method: "PUT",
      body: { spell: "00000000-0000-4000-8000-000000000000" },
    });
    expect(unknown).toMatchObject({
      status: HTTP_STATUS.notFound,
      body: { error: { code: "not_found", field: "spell" } },
    });
    const stopped = await callApi(stopSpell, { params, method: "DELETE" });
    expect(dataOf(stopped)).toMatchObject({ activeSpell: null });
  });

  test("a member reads the shared quest and its conversation; a stranger can't", async () => {
    const { her, herData, other } = await twoUsers();
    const quest = await herData.quest("Shared");
    await signIn(her);
    await callApi(castSpell, {
      params: { questId: quest.id },
      method: "PUT",
      body: { spell: "tasks" },
    });
    await callApi(sendMessage, {
      params: { questId: quest.id },
      body: { text: "help" },
    });
    await afterTasksDone();

    await signIn(other);
    expect(
      (await callApi(getConversation, { params: { questId: quest.id } }))
        .status,
    ).toBe(HTTP_STATUS.notFound);

    await addMember(her, quest.id, other);
    expect(
      dataOf(await callApi(getQuest, { params: { questId: quest.id } })),
    ).toMatchObject({ name: "Shared", sharing: { kind: "joined" } });
    expect(
      dataOf(await callApi(getConversation, { params: { questId: quest.id } })),
    ).toMatchObject({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", text: "help" }),
      ]),
    });
  });
});
