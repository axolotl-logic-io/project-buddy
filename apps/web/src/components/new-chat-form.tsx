"use client";

import { type JSX, useActionState } from "react";
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnPromptId, ProjectId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const IDLE: StartChatState = { kind: "idle" };

// A project as the form offers it: its id and name.
interface ProjectChoice {
  readonly id: ProjectId;
  readonly name: string;
}

// The choices the form shows chosen.
interface FormChoices {
  readonly projectId: ProjectId | undefined;
  readonly activityId: string;
  readonly buddyId: BuddyId | OwnPromptId;
}

// The choices the form shows chosen: hers, again, when Claude couldn't start
// the chat, since React clears the form once the action ends; otherwise the
// given project and activity, and the default buddy.
function choicesToShow(
  state: StartChatState,
  selected: Omit<FormChoices, "buddyId">,
): FormChoices {
  if (state.kind === "claudeUnavailable") {
    const { projectId, activityId, buddyId } = state;
    return { projectId, activityId, buddyId };
  }
  return { ...selected, buddyId: DEFAULT_BUDDY_ID };
}

// The form that starts a chat: its project, or none for a standalone chat,
// its activity and its buddy, built in or one of her own. The interview
// starts from the new project form, so it is not offered here.
export function NewChatForm({
  projects,
  activities,
  userBuddies,
  selectedProjectId,
  selectedActivityId,
}: {
  readonly projects: readonly ProjectChoice[];
  readonly activities: readonly ActivityChoice[];
  readonly userBuddies: readonly OwnBuddyChoice[];
  readonly selectedProjectId?: ProjectId | undefined;
  readonly selectedActivityId: string;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(startChatAction, IDLE);
  // The status line, empty except while the chat is being started, which
  // waits for the buddy's opening.
  let status = "";
  if (pending) {
    status = NEW_CHAT_COPY.starting;
  }
  const { projectId, activityId, buddyId } = choicesToShow(state, {
    projectId: selectedProjectId,
    activityId: selectedActivityId,
  });
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* React ignores a changed defaultValue on a mounted select, and the
          buddy picker goes back to its first choice when the form is
          reset, so each is mounted again for a new one. */}
      <SelectField
        defaultValue={activityId}
        key={`activity-${activityId}`}
        label={NEW_CHAT_COPY.activityLabel}
        name="activityId"
      >
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        defaultValue={projectId ?? ""}
        key={`project-${projectId ?? ""}`}
        label={NEW_CHAT_COPY.projectLabel}
        name="projectId"
      >
        <option value="">{NEW_CHAT_COPY.noProject}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </SelectField>
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
