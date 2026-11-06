"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  confirmQuestTransferAction,
  readQuestTransferAction,
} from "@/chats/quest-transfer-action.ts";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField } from "@/components/ui/field.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { userMessage } from "@/errors/app-error.ts";
import {
  type CreateProjectOutput,
  TRANSFER_MOTIVATION_MAX,
  TRANSFER_SUMMARY_MAX,
} from "@/replies/tools/create-project-contract.ts";
import { CREATE_PROJECT_COPY } from "@/ui/copy/chat.ts";

type Proposal = Extract<CreateProjectOutput, { status: "proposed" }>;

function QuestTransferForm({
  proposal,
}: {
  readonly proposal: Proposal;
}): JSX.Element {
  const [summary, setSummary] = useState(proposal.summary);
  const [motivation, setMotivation] = useState(proposal.motivation);
  const writeSummary = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setSummary(event.currentTarget.value);
    },
    [],
  );
  const writeMotivation = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setMotivation(event.currentTarget.value);
    },
    [],
  );
  const [saved, setSaved] = useState<CreateProjectOutput>();
  useEffect(() => {
    let current = true;
    readQuestTransferAction(proposal.proposalId)
      .then((next) => {
        if (current) {
          setSaved(next);
        }
      })
      .catch(() => undefined);
    return (): void => {
      current = false;
    };
  }, [proposal.proposalId]);
  const [result, confirm, pending] = useActionState(
    async (
      _previous: CreateProjectOutput | "failed" | undefined,
      form: FormData,
    ): Promise<CreateProjectOutput | "failed"> => {
      try {
        return await confirmQuestTransferAction(form);
      } catch {
        return "failed";
      }
    },
    undefined,
  );
  const created = saved ?? result;
  if (
    created !== undefined &&
    created !== "failed" &&
    created.status === "created"
  ) {
    return (
      <Link className="text-link" href={`/chats/${created.interviewChatId}`}>
        {CREATE_PROJECT_COPY.openInterview}
      </Link>
    );
  }
  let failure: string = CREATE_PROJECT_COPY.creationFailed;
  const outOfGold =
    result !== undefined &&
    result !== "failed" &&
    (result.status === "outOfGold" || result.status === "quotaUsedUp");
  if (outOfGold) {
    failure = userMessage("out-of-gold");
  }
  return (
    <form action={confirm} className="card flex flex-col gap-3">
      <p>{CREATE_PROJECT_COPY.review(proposal.name)}</p>
      <p className="field-hint">{CREATE_PROJECT_COPY.summaryHint}</p>
      <input name="id" type="hidden" value={proposal.proposalId} />
      <TextAreaField
        name="summary"
        label={CREATE_PROJECT_COPY.summary}
        value={summary}
        onChange={writeSummary}
        disabled={pending}
        maxLength={TRANSFER_SUMMARY_MAX}
        rows={6}
      />
      <TextAreaField
        name="motivation"
        label={CREATE_PROJECT_COPY.motivation}
        value={motivation}
        onChange={writeMotivation}
        disabled={pending}
        maxLength={TRANSFER_MOTIVATION_MAX}
        rows={2}
      />
      <Button type="submit" disabled={pending}>
        {CREATE_PROJECT_COPY.confirm}
      </Button>
      {pending === true && <p role="status">{CREATE_PROJECT_COPY.creating}</p>}
      {result !== undefined && (
        <Alert>
          {failure}
          {outOfGold === true && <EarnGoldLink />}
        </Alert>
      )}
    </form>
  );
}

export { QuestTransferForm };
