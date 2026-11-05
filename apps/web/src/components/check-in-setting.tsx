"use client";

import { type JSX, useActionState } from "react";
import {
  type CheckInSettingState,
  saveCheckInSettingAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import {
  CHECK_IN_FREQUENCIES,
  type CheckInFrequency,
} from "@/check-ins/check-in-frequency.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import { CHECK_IN_SETTING_COPY } from "@/ui/copy/check-ins.ts";

const IDLE: CheckInSettingState = { kind: "idle" };

const HEADING_ID = "check-ins-heading";

// A project's check-in setting: how often its construct checks in, off by
// default, saved for this project alone.
function CheckInSetting({
  projectId,
  frequency,
}: {
  readonly projectId: ProjectId;
  readonly frequency: CheckInFrequency;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(
    saveCheckInSettingAction,
    IDLE,
  );
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  let status = "";
  if (state.kind === "saved") {
    status = CHECK_IN_SETTING_COPY.saved;
  }
  return (
    <section aria-labelledby={HEADING_ID} className="panel flex flex-col gap-3">
      <h2 className="section-heading" id={HEADING_ID}>
        {CHECK_IN_SETTING_COPY.heading}
      </h2>
      <p className="text-muted">{CHECK_IN_SETTING_COPY.intro}</p>
      <form action={formAction} className="flex flex-col gap-3">
        <input name="projectId" type="hidden" value={projectId} />
        <SelectField
          className="min-h-(--target-size)"
          defaultValue={frequency}
          error={error}
          label={CHECK_IN_SETTING_COPY.label}
          name="frequency"
        >
          {CHECK_IN_FREQUENCIES.map((choice) => (
            <option key={choice} value={choice}>
              {CHECK_IN_SETTING_COPY.frequencies[choice]}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} type="submit">
            {CHECK_IN_SETTING_COPY.save}
          </Button>
          <FormStatus>{status}</FormStatus>
        </div>
      </form>
    </section>
  );
}

export { CheckInSetting };
