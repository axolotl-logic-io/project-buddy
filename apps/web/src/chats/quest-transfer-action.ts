"use server";

import { requireUser } from "@/auth/current-user.ts";
import {
  CONFIRM_TRANSFER,
  confirmQuestTransfer,
  readQuestTransfer,
} from "@/chats/quest-transfer.ts";
import type { CreateProjectOutput } from "@/replies/tools/create-project-contract.ts";

export async function confirmQuestTransferAction(
  form: FormData,
): Promise<CreateProjectOutput> {
  const user = await requireUser();
  return confirmQuestTransfer(
    user.id,
    CONFIRM_TRANSFER.parse(Object.fromEntries(form)),
  );
}

export async function readQuestTransferAction(
  id: string,
): Promise<CreateProjectOutput | undefined> {
  const user = await requireUser();
  return readQuestTransfer(user.id, id);
}
