import type { JSX } from "react";
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import type { ChatId } from "@/ids.ts";
import { SELECT_ACTIVITY_COPY } from "@/ui/copy/chat.ts";
import { changeActivityAction } from "./actions.ts";

// The chat's current activity, which she can change to any activity the
// chat can be in. The buddy changes it too (select_activity), and the page
// shows its change once the reply has finished. The form is mounted again
// for each activity, so its select shows the current one.
export function ActivityForm({
  chatId,
  activityId,
  activities,
}: {
  readonly chatId: ChatId;
  readonly activityId: string;
  readonly activities: readonly ActivityChoice[];
}): JSX.Element {
  return (
    <form
      action={changeActivityAction}
      className="flex flex-wrap items-end gap-3"
      key={activityId}
    >
      <input name="chatId" type="hidden" value={chatId} />
      <SelectField
        defaultValue={activityId}
        label={SELECT_ACTIVITY_COPY.label}
        name="activityId"
      >
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="quiet">
        {SELECT_ACTIVITY_COPY.change}
      </Button>
    </form>
  );
}
