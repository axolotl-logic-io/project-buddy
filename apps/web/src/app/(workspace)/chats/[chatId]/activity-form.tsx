"use client";

import { type ChangeEvent, type JSX, useActionState } from "react";
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { SelectField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { ChatId } from "@/ids.ts";
import { SELECT_ACTIVITY_COPY } from "@/ui/copy/chat.ts";
import { changeActivityAction } from "./actions.ts";

// Native selection changes submit immediately, including keyboard selections.
function selectActivity(event: ChangeEvent<HTMLSelectElement>): void {
  event.currentTarget.form?.requestSubmit();
}

interface ActivityState {
  readonly saved: string;
  readonly revision: number;
  readonly error?: string;
}

// Saves each choice immediately. A failed save remounts the select with the
// last saved choice, while leaving a retry instruction beside it.
function ActivityForm({
  chatId,
  activityId,
  activities,
}: {
  readonly chatId: ChatId;
  readonly activityId: string;
  readonly activities: readonly ActivityChoice[];
}): JSX.Element {
  const [state, changeActivity, pending] = useActionState(
    async (previous: ActivityState, form: FormData): Promise<ActivityState> => {
      const next = form.get("activityId");
      if (typeof next !== "string" || next === previous.saved) {
        return previous;
      }
      try {
        await changeActivityAction(form);
        return { saved: next, revision: previous.revision + 1 };
      } catch {
        return {
          saved: previous.saved,
          revision: previous.revision + 1,
          error: SELECT_ACTIVITY_COPY.failed,
        };
      }
    },
    { saved: activityId, revision: 0 },
  );
  return (
    <form action={changeActivity} aria-busy={pending}>
      <input name="chatId" type="hidden" value={chatId} />
      <SelectField
        className="min-h-(--target-size)"
        disabled={pending}
        error={state.error}
        key={state.revision}
        defaultValue={state.saved}
        label={SELECT_ACTIVITY_COPY.label}
        name="activityId"
        onChange={selectActivity}
      >
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.name}
          </option>
        ))}
      </SelectField>
      <FormStatus>
        {pending === true && SELECT_ACTIVITY_COPY.changing}
      </FormStatus>
    </form>
  );
}

export { ActivityForm };
