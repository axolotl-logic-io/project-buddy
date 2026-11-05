"use client";

import { type JSX, useActionState, useId } from "react";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import type { BuddyId } from "@/buddies/index.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnPromptId } from "@/ids.ts";
import { INTERVIEW_BUDDY_COPY } from "@/ui/copy/settings.ts";
import {
  type InterviewBuddyState,
  setInterviewBuddyAction,
} from "./actions.ts";

const IDLE: InterviewBuddyState = { kind: "idle" };

function InterviewBuddyForm({
  buddyId,
  userBuddies,
}: {
  readonly buddyId: BuddyId | OwnPromptId;
  readonly userBuddies: readonly OwnBuddyChoice[];
}): JSX.Element {
  const headingId = useId();
  const [state, action, pending] = useActionState(
    setInterviewBuddyAction,
    IDLE,
  );
  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-3">
      <h2 className="section-heading" id={headingId}>
        {INTERVIEW_BUDDY_COPY.heading}
      </h2>
      <p className="field-hint">{INTERVIEW_BUDDY_COPY.hint}</p>
      <form action={action} className="flex flex-col gap-3">
        <BuddyPicker
          defaultBuddyId={buddyId}
          key={buddyId}
          label={INTERVIEW_BUDDY_COPY.heading}
          userBuddies={userBuddies}
        />
        {state.kind === "invalid" && (
          <Alert>{INTERVIEW_BUDDY_COPY.invalid}</Alert>
        )}
        <Button disabled={pending} type="submit">
          {INTERVIEW_BUDDY_COPY.save}
        </Button>
        <FormStatus>
          {state.kind === "saved" && INTERVIEW_BUDDY_COPY.saved}
        </FormStatus>
      </form>
    </section>
  );
}

export { InterviewBuddyForm };
