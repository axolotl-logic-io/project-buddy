import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { questTransferOwnedBy } from "@/accounts/owner-scope.ts";
import { getChat } from "@/chats/store.ts";
import { DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { questTransfers } from "@/db/tables/quest-transfers.ts";
import { AppError } from "@/errors/app-error.ts";
import { CHAT_ID, PROJECT_ID, type UserId } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import type { ChatToolContext } from "@/replies/tools/chat-tool-context.ts";
import {
  type CreateProjectInput,
  type CreateProjectOutput,
  TRANSFER_MOTIVATION_MAX,
  TRANSFER_SUMMARY_MAX,
} from "@/replies/tools/create-project-contract.ts";

async function proposeQuestTransfer(
  context: ChatToolContext,
  input: CreateProjectInput,
): Promise<CreateProjectOutput> {
  const chat = await getChat(context.actingUser, context.chatId);
  if (chat === undefined) {
    throw new AppError("not-found", undefined);
  }
  await getDb()
    .insert(questTransfers)
    .values({
      userId: context.actingUser,
      sourceChatId: chat.id,
      sourceMessageId: context.answeredId,
      name: input.name,
      summary: input.summary,
      motivation: input.motivation,
    })
    .onConflictDoNothing();
  const [proposal] = await getDb()
    .select()
    .from(questTransfers)
    .where(
      and(
        questTransferOwnedBy(context.actingUser),
        eq(questTransfers.sourceMessageId, context.answeredId),
      ),
    );
  if (proposal === undefined) {
    throw new AppError("not-found", undefined);
  }
  return {
    status: "proposed",
    proposalId: proposal.id,
    name: proposal.name,
    summary: proposal.summary,
    motivation: proposal.motivation,
  };
}

async function readQuestTransfer(
  owner: UserId,
  id: string,
): Promise<CreateProjectOutput | undefined> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) {
    return undefined;
  }
  const [proposal] = await getDb()
    .select()
    .from(questTransfers)
    .where(
      and(questTransferOwnedBy(owner), eq(questTransfers.id, parsed.data)),
    );
  if (
    proposal?.projectId === null ||
    proposal?.targetChatId === null ||
    proposal === undefined
  ) {
    return undefined;
  }
  if ((await getChat(owner, proposal.targetChatId)) === undefined) {
    return undefined;
  }
  return {
    status: "created",
    projectId: PROJECT_ID.parse(proposal.projectId),
    interviewChatId: CHAT_ID.parse(proposal.targetChatId),
    name: proposal.name,
  };
}

const CONFIRM_TRANSFER = z.object({
  id: z.uuid(),
  summary: z.string().trim().max(TRANSFER_SUMMARY_MAX),
  motivation: z.string().trim().max(TRANSFER_MOTIVATION_MAX),
});

// Serialize confirmation through opening generation and save the confirmed
// Journal and result link in the same transaction as the quest. Retries read
// that result; failures commit no quest and keep the standalone source intact.
async function confirmQuestTransfer(
  owner: UserId,
  input: z.infer<typeof CONFIRM_TRANSFER>,
): Promise<CreateProjectOutput> {
  const confirmed = CONFIRM_TRANSFER.parse(input);
  return await inTransaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(questTransfers)
      .where(
        and(questTransferOwnedBy(owner), eq(questTransfers.id, confirmed.id)),
      )
      .for("update");
    if (proposal === undefined) {
      throw new AppError("not-found", undefined);
    }
    const name = PROJECT_NAME.parse(proposal.name);
    if (proposal.projectId !== null && proposal.targetChatId !== null) {
      return {
        status: "created",
        projectId: PROJECT_ID.parse(proposal.projectId),
        interviewChatId: CHAT_ID.parse(proposal.targetChatId),
        name,
      };
    }
    if (proposal.completed) {
      throw new AppError("not-found", undefined);
    }
    const source = await getChat(owner, proposal.sourceChatId);
    if (source === undefined) {
      throw new AppError("not-found", undefined);
    }
    let journal = confirmed.summary;
    if (confirmed.motivation !== "") {
      journal += `\n\n## Motivation\n${confirmed.motivation}`;
    }
    const started = await startProject(
      owner,
      name,
      { id: DEFAULT_CONSTRUCT_ID, ...source.construct },
      { motivation: journal, transaction: tx },
    );
    if (started.kind !== "started") {
      return { status: started.kind };
    }
    await tx
      .update(questTransfers)
      .set({
        completed: true,
        summary: confirmed.summary,
        motivation: confirmed.motivation,
        projectId: started.chat.project.id,
        targetChatId: started.chat.id,
      })
      .where(
        and(questTransferOwnedBy(owner), eq(questTransfers.id, proposal.id)),
      );
    return {
      status: "created",
      projectId: started.chat.project.id,
      interviewChatId: started.chat.id,
      name,
    };
  });
}

export {
  CONFIRM_TRANSFER,
  confirmQuestTransfer,
  proposeQuestTransfer,
  readQuestTransfer,
};
