"use client";

import { type JSX, useActionState, useId } from "react";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import type { ConstructId } from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { INTERVIEW_CONSTRUCT_COPY } from "@/ui/copy/settings.ts";
import {
  type InterviewConstructState,
  setInterviewConstructAction,
} from "./actions.ts";

const IDLE: InterviewConstructState = { kind: "idle" };

function InterviewConstructForm({
  constructId,
  userConstructs,
}: {
  readonly constructId: ConstructId | OwnPromptId;
  readonly userConstructs: readonly OwnConstructChoice[];
}): JSX.Element {
  const headingId = useId();
  const [state, action, pending] = useActionState(
    setInterviewConstructAction,
    IDLE,
  );
  return (
    <section aria-labelledby={headingId} className="panel flex flex-col gap-3">
      <h2 className="section-heading" id={headingId}>
        {INTERVIEW_CONSTRUCT_COPY.heading}
      </h2>
      <p className="field-hint">{INTERVIEW_CONSTRUCT_COPY.hint}</p>
      <form action={action} className="flex flex-col gap-3">
        <ConstructPicker
          defaultConstructId={constructId}
          key={constructId}
          label={INTERVIEW_CONSTRUCT_COPY.heading}
          userConstructs={userConstructs}
        />
        {state.kind === "invalid" && (
          <Alert>{INTERVIEW_CONSTRUCT_COPY.invalid}</Alert>
        )}
        <Button disabled={pending} type="submit">
          {INTERVIEW_CONSTRUCT_COPY.save}
        </Button>
        <FormStatus>
          {state.kind === "saved" && INTERVIEW_CONSTRUCT_COPY.saved}
        </FormStatus>
      </form>
    </section>
  );
}

export { InterviewConstructForm };
