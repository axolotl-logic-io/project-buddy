"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { NEW_PROJECT } from "@/chats/new-chat-selection.ts";
import { type StartChatResult, startChat } from "@/chats/start-chat.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import type { ConstructId } from "@/constructs/index.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { userMessage } from "@/errors/app-error.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  checkProjectName,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";
import { getProject, type Project } from "@/projects/store.ts";
import { NEW_CHAT_COPY, OPENING_COPY } from "@/ui/copy/chat.ts";

// The form: a project by id, NEW_PROJECT for a new one or "" for none, an
// activity and a construct, each by id, and a new project's name. A missing
// activity is the default one.
const START_CHAT_FORM = z.object({
  projectId: z.string().default(""),
  activityId: z.string().default(DEFAULT_ACTIVITY_ID),
  constructId: z.string().default(""),
  name: z.string().default(""),
  motivation: z.string().trim().default(""),
});

type StartChatForm = z.infer<typeof START_CHAT_FORM>;

// The choices the form shows again when nothing was started but they still
// stand: the project as the form sent it, and a new project's name.
interface StartChatChoices {
  readonly projectId: string;
  readonly activityId: string;
  readonly constructId: ConstructId | OwnPromptId;
  readonly name: string;
  readonly motivation?: string;
}

// The new-chat form's state: as first shown, after a submission without a
// known project, activity or construct, after one that asked for a new project
// with its name missing or too long, or after Claude couldn't open the chat, so nothing was
// started and the form shows her choices again, or after she was found out
// of gold, so nothing was started. A storage failure throws, for
// the error boundary.
type StartChatState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | ({
      readonly kind: "invalidProjectName" | "claudeUnavailable";
      readonly message: string;
    } & StartChatChoices)
  | { readonly kind: "outOfGold"; readonly message: string };

// The state after trying to start: the started chat opens; otherwise the
// form says Claude is unavailable, with her choices, or that she is out of
// gold.
function afterStart(
  started: StartChatResult,
  choices: StartChatChoices,
): StartChatState {
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      ...choices,
    };
  }
  if (started.kind === "outOfGold") {
    return { kind: "outOfGold", message: userMessage("out-of-gold") };
  }
  return redirect(`/chats/${started.chat.id}`);
}

// Creates the project named in the form and its first chat, in the project
// chosen activity and construct, and opens it; or asks for the name it
// lacks, or for a shorter one.
async function startNewProject(
  owner: UserId,
  form: StartChatForm,
): Promise<StartChatState> {
  const [activity, construct] = await Promise.all([
    chosenActivity(owner, form.activityId),
    chosenConstruct(owner, form.constructId),
  ]);
  if (activity === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseActivity };
  }
  if (construct === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseConstruct };
  }
  const choices = {
    projectId: NEW_PROJECT,
    activityId: activity.id,
    constructId: construct.id,
    name: form.name,
    motivation: form.motivation,
  };
  const name = checkProjectName(form.name);
  if (name.kind !== "named") {
    let message: string = NEW_CHAT_COPY.needsProjectName;
    if (name.kind === "tooLong") {
      message = NEW_CHAT_COPY.projectNameTooLong(PROJECT_NAME_MAX_LENGTH);
    }
    return { kind: "invalidProjectName", message, ...choices };
  }
  return afterStart(
    await startProject(owner, name.name, construct.construct, {
      motivation: form.motivation,
      activity,
    }),
    choices,
  );
}

// The owner's project with this id, or undefined for none; false when the id
// names no project of hers.
async function chosenProject(
  owner: Parameters<typeof getProject>[0],
  projectId: string,
): Promise<Project | undefined | false> {
  if (projectId === "") {
    return undefined;
  }
  const project = await getProject(owner, projectId);
  return project ?? false;
}

// Starts the chat, in its project or in none, in its activity and construct,
// with the construct's opening, and opens it; or, for a new project, creates the
// project with its first chat in the selected activity. Or says what the
// form is missing, that Claude is unavailable, or
// that she is out of gold. A project, activity or construct
// of another user's reads as an unknown one.
async function startChatAction(
  _state: StartChatState,
  formData: FormData,
): Promise<StartChatState> {
  const user = await requireUser();
  const form = START_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseConstruct };
  }
  if (form.data.projectId === NEW_PROJECT) {
    return startNewProject(user.id, form.data);
  }
  const [project, activity, construct] = await Promise.all([
    chosenProject(user.id, form.data.projectId),
    chosenActivity(user.id, form.data.activityId),
    chosenConstruct(user.id, form.data.constructId),
  ]);
  if (project === false) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseProject };
  }
  if (activity === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseActivity };
  }
  if (construct === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseConstruct };
  }
  const started = await startChat(user.id, {
    project,
    construct: construct.construct,
    activity,
  });
  return afterStart(started, {
    projectId: project?.id ?? "",
    activityId: activity.id,
    constructId: construct.id,
    name: "",
  });
}

export type { StartChatState };
export { startChatAction };
