"use client";

import { type JSX, useActionState } from "react";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import {
  type StartConversationState,
  startConversationAction,
} from "./actions.ts";

const IDLE: StartConversationState = { kind: "idle" };

// Start the conversation, for a quest that has none yet: the explicit
// action that writes its opening and spends batteries.
function StartConversationForm({
  projectId,
}: {
  readonly projectId: ProjectId;
}): JSX.Element {
  const [state, action, pending] = useActionState(
    startConversationAction,
    IDLE,
  );
  let status = "";
  if (pending) {
    status = QUEST_CONVERSATION_COPY.starting;
  }
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <Button disabled={pending} type="submit">
        {QUEST_CONVERSATION_COPY.start}
      </Button>
      <FormStatus>{status}</FormStatus>
      {state.kind !== "idle" && (
        <Alert>
          <span>{state.message}</span>
          {state.kind === "outOfGold" && <EarnGoldLink />}
        </Alert>
      )}
    </form>
  );
}

export { StartConversationForm };
