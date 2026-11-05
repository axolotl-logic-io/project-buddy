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
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
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
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnPromptId, ProjectId } from "@/ids.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

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
  if (
    state.kind === "claudeUnavailable" ||
    state.kind === "invalidProjectName"
  ) {
    const { buddyId, name } = state;
    return { buddyId, name };
  }
  return { buddyId: DEFAULT_BUDDY_ID, name: "" };
}

function motivationToShow(state: StartChatState): string {
  if (
    state.kind === "invalidProjectName" ||
    state.kind === "claudeUnavailable"
  ) {
    return state.motivation ?? "";
  }
  return "";
}

function changeActivity(
  select: Dispatch<SetStateAction<NewChatSelection>>,
  event: ChangeEvent<HTMLSelectElement>,
): void {
  const { value } = event.currentTarget;
  select((selection) => chooseActivity(selection, value));
}

// Chooses the activity alone, in a form whose project is fixed: the
// interview then interviews for that project rather than a new one.
function changeActivityAlone(
  select: Dispatch<SetStateAction<NewChatSelection>>,
  event: ChangeEvent<HTMLSelectElement>,
): void {
  const { value } = event.currentTarget;
  select((selection) => ({ ...selection, activityId: value }));
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

// The form's project choices: projects to choose among, with the one
// chosen first, or one project the form always starts its chats in, which
// it doesn't show.
type ProjectChoices =
  | {
      readonly projects: readonly ProjectChoice[];
      readonly selectedProjectId?: ProjectId | undefined;
      readonly projectId?: undefined;
    }
  | {
      readonly projectId: ProjectId;
      readonly projects?: undefined;
      readonly selectedProjectId?: undefined;
    };

// The selection to show first: with a fixed project, that project and the
// activity as given; otherwise the given activity and project, paired.
function firstSelection(
  activityId: string,
  projectId: ProjectId | undefined,
  selectedProjectId: ProjectId | undefined,
): NewChatSelection {
  if (projectId !== undefined) {
    return { activityId, projectId };
  }
  return initialSelection({ activityId, projectId: selectedProjectId ?? "" });
}

// The form that starts a chat: its project, a new project, or none for a
// standalone chat, its activity and its buddy, built in or one of her own.
// A new project starts in the interview; an existing project can revisit it. Starting a new project first asks for its name, in a
// dialog that submits the form, and Cancel goes back to the form as it was.
// Given a projectId, the form has no project field, and starts every chat
// in that project, in whichever activity is chosen. With fixedActivity,
// the activity field is hidden and project choices preserve that activity.
export function NewChatForm({
  projects,
  projectId,
  activities,
  userBuddies,
  selectedProjectId,
  selectedActivityId,
  fixedActivity = false,
}: ProjectChoices & {
  readonly activities: readonly ActivityChoice[];
  readonly userBuddies: readonly OwnBuddyChoice[];
  readonly selectedActivityId: string;
  readonly fixedActivity?: boolean;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(startChatAction, IDLE);
  const [selection, select] = useState(() =>
    firstSelection(selectedActivityId, projectId, selectedProjectId),
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
  if (state.kind === "invalidProjectName") {
    ({ message: nameError } = state);
  }
  let message: string | undefined;
  if (state.kind !== "idle" && state.kind !== "invalidProjectName") {
    ({ message } = state);
  }
  let onActivityChange = changeActivity.bind(null, select);
  if (projectId !== undefined) {
    onActivityChange = changeActivityAlone.bind(null, select);
  }
  const onProjectChange = changeProject.bind(null, select);
  const onSubmit = submitOrAskName.bind(
    null,
    setNaming.bind(null, true),
    selection.projectId === NEW_PROJECT && naming === false,
    formAction,
  );
  return (
    <form className="flex flex-col gap-5" id={formId} onSubmit={onSubmit}>
      {fixedActivity === true && (
        <input name="activityId" type="hidden" value={selection.activityId} />
      )}
      {fixedActivity === false && (
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
      )}
      {selection.activityId === INTERVIEW_ACTIVITY_ID &&
        selection.projectId !== "" &&
        selection.projectId !== NEW_PROJECT && (
          <p className="text-muted">{NEW_CHAT_COPY.revisitInterviewHint}</p>
        )}
      {projects === undefined && (
        <input name="projectId" type="hidden" value={selection.projectId} />
      )}
      {projects !== undefined && (
        <SelectField
          label={NEW_CHAT_COPY.projectLabel}
          name="projectId"
          onChange={onProjectChange}
          value={selection.projectId}
        >
          <optgroup label={NEW_CHAT_COPY.projectOptions}>
            {(fixedActivity === false ||
              selectedActivityId !== INTERVIEW_ACTIVITY_ID) && (
              <option value="">{NEW_CHAT_COPY.noProject}</option>
            )}
            {(fixedActivity === false ||
              selectedActivityId === INTERVIEW_ACTIVITY_ID) && (
              <option value={NEW_PROJECT}>{NEW_CHAT_COPY.newProject}</option>
            )}
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
      )}
      {/* The buddy picker reads its choice once, so it is mounted again
          for each choice to show. */}
      {selection.projectId !== NEW_PROJECT && (
        <BuddyPicker
          defaultBuddyId={buddyId}
          key={buddyId}
          userBuddies={userBuddies}
        />
      )}
      {message !== undefined && naming === false && (
        <Alert>
          <span>{message}</span>
          {state.kind === "outOfGold" && <EarnGoldLink />}
        </Alert>
      )}
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
              maxLength={PROJECT_NAME_MAX_LENGTH}
              name="name"
              required={true}
              type="text"
            />
            <TextAreaField
              defaultValue={motivationToShow(state)}
              form={formId}
              label={PROJECTS_COPY.motivationLabel}
              hint={PROJECTS_COPY.motivationHint}
              name="motivation"
              rows={3}
            />
            {message !== undefined && (
              <Alert>
                <span>{message}</span>
                {state.kind === "outOfGold" && <EarnGoldLink />}
              </Alert>
            )}
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
