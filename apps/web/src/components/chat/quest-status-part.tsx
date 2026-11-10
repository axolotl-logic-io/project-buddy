"use client";

import Link from "next/link";
import { type JSX, useActionState, useEffect, useState } from "react";
import {
  answerQuestStatusAction,
  readQuestStatusApprovalAction,
} from "@/app/(workspace)/projects/status-actions.ts";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { UndoStatusChange } from "@/components/quest-status-controls.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type {
  StatusActionState,
  StatusApproval,
} from "@/projects/quest-status.ts";
import { QUEST_STATUS_OUTPUT } from "@/replies/tools/quest-status-contract.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const IDLE: StatusActionState = { kind: "idle" };

function ApprovalCard({
  proposal,
}: {
  readonly proposal: StatusApproval;
}): JSX.Element {
  const [state, action, pending] = useActionState(
    answerQuestStatusAction,
    IDLE,
  );
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<StatusApproval>();
  useEffect(() => {
    let current = true;
    readQuestStatusApprovalAction(proposal.id)
      .then((latest) => {
        if (current) {
          setSaved(latest);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (current) {
          setLoaded(true);
        }
      });
    return (): void => {
      current = false;
    };
  }, [proposal.id]);
  const approval = state.approval ?? saved;
  const details = approval ?? proposal;
  let message: string = QUEST_STATUS_COPY.loading;
  let enabled = false;
  if (loaded === true) {
    message = QUEST_STATUS_COPY.unavailable;
    if (approval !== undefined) {
      message = QUEST_STATUS_COPY.decisions[approval.decision];
      enabled = approval.decision === "pending";
    }
  }
  return (
    <aside
      aria-label={QUEST_STATUS_COPY.approvalHeading}
      className="card flex flex-col gap-3 text-sm"
    >
      <p className="icon-line font-medium">
        <Icon name="compass" />
        {QUEST_STATUS_COPY.approvalHeading}
      </p>
      <p>{details.name}</p>
      <p>
        {QUEST_STATUS_COPY.change(
          QUEST_STATUS_COPY.labels[details.fromStatus],
          QUEST_STATUS_COPY.labels[details.toStatus],
        )}
      </p>
      <p className="text-muted">{QUEST_STATUS_COPY.effects}</p>
      <FormStatus>{message}</FormStatus>
      {state.kind === "invalid" && <Alert>{state.message}</Alert>}
      {enabled && (
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={proposal.id} />
          <Button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
          >
            {QUEST_STATUS_COPY.confirm[proposal.toStatus]}
          </Button>
          <Button
            type="submit"
            name="decision"
            value="decline"
            variant="secondary"
            disabled={pending}
          >
            {QUEST_STATUS_COPY.decline}
          </Button>
        </form>
      )}
      {state.change !== undefined && <UndoStatusChange change={state.change} />}
      <Button asChild={true} variant="quiet" className="self-start">
        <Link href={`/projects/${details.projectId}`}>
          {QUEST_STATUS_COPY.open}
        </Link>
      </Button>
    </aside>
  );
}

function QuestStatusPart({
  part,
}: {
  readonly part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = QUEST_STATUS_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  return (
    <ApprovalCard
      key={output.data.approval.id}
      proposal={output.data.approval}
    />
  );
}

export { QuestStatusPart };
