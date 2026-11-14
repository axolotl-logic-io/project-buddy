"use client";

import { type JSX, useActionState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import {
  type StartConversationState,
  startConversationAction,
} from "./actions.ts";

const IDLE: StartConversationState = { kind: "idle" };

// Start the conversation, for a quest that has none yet: the explicit
// action that writes its opening and spends batteries.
function StartConversationForm({
  questId,
}: {
  readonly questId: QuestId;
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
      <input type="hidden" name="questId" value={questId} />
      <Button disabled={pending} type="submit">
        {QUEST_CONVERSATION_COPY.start}
      </Button>
      <FormStatus>{status}</FormStatus>
      {state.kind !== "idle" && (
        <Alert>
          <span>{state.message}</span>
        </Alert>
      )}
    </form>
  );
}

export { StartConversationForm };
