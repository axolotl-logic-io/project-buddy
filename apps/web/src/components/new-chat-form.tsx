"use client";

import { Dialog } from "radix-ui";
import {
  type ChangeEvent,
  type Dispatch,
  type JSX,
  type SetStateAction,
  type SubmitEvent,
  startTransition,
  useActionState,
  useId,
  useState,
} from "react";
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import {
  chooseActivity,
  chooseProject,
  initialSelection,
  NEW_PROJECT,
  type NewChatSelection,
} from "@/chats/new-chat-selection.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnPromptId, ProjectId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const IDLE: StartChatState = { kind: "idle" };

// A project as the form offers it: its id and name.
interface ProjectChoice {
  readonly id: ProjectId;
  readonly name: string;
}

// The buddy and new project's name the form shows: the ones the action
// answered with, when nothing was started but her choices stand; otherwise
// the default buddy and no name.
function choicesToShow(state: StartChatState): {
  buddyId: BuddyId | OwnPromptId;
  name: string;
} {
  if (state.kind === "claudeUnavailable" || state.kind === "needsProjectName") {
    const { buddyId, name } = state;
    return { buddyId, name };
  }
  return { buddyId: DEFAULT_BUDDY_ID, name: "" };
}

function changeActivity(
  select: Dispatch<SetStateAction<NewChatSelection>>,
  event: ChangeEvent<HTMLSelectElement>,
): void {
  const { value } = event.currentTarget;
  select((selection) => chooseActivity(selection, value));
}

function changeProject(
  select: Dispatch<SetStateAction<NewChatSelection>>,
  event: ChangeEvent<HTMLSelectElement>,
): void {
  const { value } = event.currentTarget;
  select((selection) => chooseProject(selection, value));
}

// Submits the form to start, or asks for the new project's name first,
// while it is needed and not yet being asked for. It submits in a
// transition rather than through the form's action, which would reset the
// form afterwards and lose the chosen activity and project.
function submitOrAskName(
  askForName: () => void,
  needsName: boolean,
  start: (form: FormData) => void,
  event: SubmitEvent<HTMLFormElement>,
): void {
  event.preventDefault();
  if (needsName) {
    askForName();
    return;
  }
  const form = new FormData(event.currentTarget);
  startTransition(() => {
    start(form);
  });
}

// The form that starts a chat: its project, a new project, or none for a
// standalone chat, its activity and its buddy, built in or one of her own.
// The project interview and a new project go together: choosing one
// chooses the other. Starting a new project first asks for its name, in a
// dialog that submits the form, and Cancel goes back to the form as it was.
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
  const [selection, select] = useState(() =>
    initialSelection({
      activityId: selectedActivityId,
      projectId: selectedProjectId ?? "",
    }),
  );
  const [naming, setNaming] = useState(false);
  const formId = useId();
  // The status line, empty except while the chat is being started, which
  // waits for the buddy's opening.
  let status = "";
  if (pending) {
    status = NEW_CHAT_COPY.starting;
  }
  const { buddyId, name } = choicesToShow(state);
  let nameError: string | undefined;
  if (state.kind === "needsProjectName") {
    ({ message: nameError } = state);
  }
  let message: string | undefined;
  if (state.kind !== "idle" && state.kind !== "needsProjectName") {
    ({ message } = state);
  }
  const onActivityChange = changeActivity.bind(null, select);
  const onProjectChange = changeProject.bind(null, select);
  const onSubmit = submitOrAskName.bind(
    null,
    setNaming.bind(null, true),
    selection.projectId === NEW_PROJECT && naming === false,
    formAction,
  );
  return (
    <form className="flex flex-col gap-5" id={formId} onSubmit={onSubmit}>
      <SelectField
        label={NEW_CHAT_COPY.activityLabel}
        name="activityId"
        onChange={onActivityChange}
        value={selection.activityId}
      >
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={NEW_CHAT_COPY.projectLabel}
        name="projectId"
        onChange={onProjectChange}
        value={selection.projectId}
      >
        <optgroup label={NEW_CHAT_COPY.projectOptions}>
          <option value="">{NEW_CHAT_COPY.noProject}</option>
          <option value={NEW_PROJECT}>{NEW_CHAT_COPY.newProject}</option>
        </optgroup>
        {projects.length > 0 && (
          <optgroup label={NEW_CHAT_COPY.existingProjects}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </optgroup>
        )}
      </SelectField>
      {/* The buddy picker reads its choice once, so it is mounted again
          for each choice to show. */}
      <BuddyPicker
        defaultBuddyId={buddyId}
        key={buddyId}
        userBuddies={userBuddies}
      />
      {message !== undefined && naming === false && <Alert>{message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {NEW_CHAT_COPY.start}
        </Button>
        {naming === false && <FormStatus>{status}</FormStatus>}
      </div>
      <Dialog.Root onOpenChange={setNaming} open={naming}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content aria-describedby={undefined} className="dialog-panel">
            <Dialog.Title className="section-heading">
              {NEW_CHAT_COPY.projectNameHeading}
            </Dialog.Title>
            {/* The dialog is outside the form's element, so its name field
                and button join the form by its id. */}
            <TextField
              defaultValue={name}
              error={nameError}
              form={formId}
              key={`name-${name}`}
              label={NEW_CHAT_COPY.projectNameLabel}
              name="name"
              required={true}
              type="text"
            />
            {message !== undefined && <Alert>{message}</Alert>}
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={pending} form={formId} type="submit">
                {NEW_CHAT_COPY.startProject}
              </Button>
              <Dialog.Close asChild={true}>
                <Button variant="secondary">
                  {NEW_CHAT_COPY.cancelProjectName}
                </Button>
              </Dialog.Close>
              <FormStatus>{status}</FormStatus>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </form>
  );
}
