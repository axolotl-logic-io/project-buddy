"use client";

import { type JSX, useActionState } from "react";
import {
  type StartStandaloneChatState,
  startStandaloneChatAction,
} from "@/app/(workspace)/chat/actions.ts";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { UserBuddyId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const IDLE: StartStandaloneChatState = { kind: "idle" };

function NewStandaloneChatForm({
  userBuddies,
}: {
  readonly userBuddies: readonly OwnBuddyChoice[];
}): JSX.Element {
  const [state, formAction, pending] = useActionState(
    startStandaloneChatAction,
    IDLE,
  );
  let status = "";
  if (pending) {
    status = NEW_CHAT_COPY.starting;
  }
  let buddyId: BuddyId | UserBuddyId = DEFAULT_BUDDY_ID;
  if (state.kind === "quotaUsedUp") {
    ({ buddyId } = state);
  }
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <BuddyPicker
        defaultBuddyId={buddyId}
        key={buddyId}
        userBuddies={userBuddies}
      />
      {state.kind !== "idle" && <Alert>{state.message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {NEW_CHAT_COPY.start}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}

export { NewStandaloneChatForm };
