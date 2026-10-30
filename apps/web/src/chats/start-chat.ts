// Starting a chat, in a project, in none, or in a new project: the buddy's
// opening (chat-opening.ts) is written first, as the chat's activity asks,
// then the chat is saved with it as its first message, so the user finds the
// buddy already speaking. It takes as long as Claude takes to write the
// opening, up to the opening's timeout. When Claude can't write it, nothing
// is saved: no chat, and no new project. Once the owner's monthly quota is
// used up (src/quota/quota.ts), nothing is asked of Claude and nothing is
// saved. The rows are saved together, in one transaction, so a failure
// leaves no chat without its opening and no project without its chat.
import { readUserName } from "@/accounts/users-store.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import {
  builtInActivity,
  type ChatActivity,
} from "@/activities/chosen-activity.ts";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";
import type { Chat, ProjectChat } from "@/chats/chat-rows.ts";
import {
  createChatWithOpening,
  createProjectWithChat,
  type NewChatBuddy,
} from "@/chats/new-chat-store.ts";
import type { UserId } from "@/ids.ts";
import { EMPTY_MEMORY, type Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import type { Project } from "@/projects/store.ts";
import { checkQuota, type QuotaGrant } from "@/quota/quota.ts";
import { writeChatOpening } from "@/replies/chat-opening.ts";
import type { PromptProject } from "@/replies/system-prompt.ts";

// The chat, saved with its opening, or why nothing was saved: Claude is
// unavailable, or the owner's quota is used up until resetsOn.
type StartChatResult<Started extends Chat = Chat> =
  | { readonly kind: "started"; readonly chat: Started }
  | { readonly kind: "claudeUnavailable" }
  | { readonly kind: "quotaUsedUp"; readonly resetsOn: Date };

const CLAUDE_UNAVAILABLE = { kind: "claudeUnavailable" } as const;

// What a new chat starts with: its project, or none for a standalone chat,
// its buddy, which the chat keeps as it is now, with any {{name}} as
// written, and its first activity, which sets how the buddy opens it.
interface NewChatChoice {
  readonly project: Project | undefined;
  readonly buddy: NewChatBuddy;
  readonly activity: ChatActivity;
}

// The opening of a chat of the owner's in project, with memory, or in none,
// in buddy and activity, charged to grant; undefined when Claude can't
// write it.
async function openingFor(
  owner: UserId,
  grant: QuotaGrant,
  project: PromptProject | undefined,
  { buddy, activity }: Pick<NewChatChoice, "buddy" | "activity">,
): ReturnType<typeof writeChatOpening> {
  const [activities, userName] = await Promise.all([
    activityChoices(owner),
    readUserName(owner),
  ]);
  return writeChatOpening({
    grant,
    activities,
    project,
    buddy,
    activity,
    userName,
  });
}

// The project as a new chat's prompt reads it, with the owner's memory of
// it as it is now; undefined for a standalone chat.
async function projectWithMemory(
  owner: UserId,
  project: Project | undefined,
): Promise<PromptProject | undefined> {
  if (project === undefined) {
    return undefined;
  }
  const memory: Memory = await readMemory(owner, project.id);
  return { name: project.name, memory };
}

// A new chat of the owner's, as choice says. A storage failure throws, and
// so does a project of another user's, as not found.
async function startChat(
  owner: UserId,
  choice: NewChatChoice,
): Promise<StartChatResult> {
  const quota = await checkQuota(owner);
  if (quota.kind === "usedUp") {
    return { kind: "quotaUsedUp", resetsOn: quota.resetsOn };
  }
  const opening = await openingFor(
    owner,
    quota.grant,
    await projectWithMemory(owner, choice.project),
    choice,
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createChatWithOpening(owner, choice, opening);
  return { kind: "started", chat };
}

// A new project of the owner's named name, with its first chat in the
// buddy, which the chat keeps as it is now, in the project interview. A
// storage failure throws.
async function startProject(
  owner: UserId,
  name: string,
  buddy: NewChatBuddy,
): Promise<StartChatResult<ProjectChat>> {
  const quota = await checkQuota(owner);
  if (quota.kind === "usedUp") {
    return { kind: "quotaUsedUp", resetsOn: quota.resetsOn };
  }
  const activity = builtInActivity(INTERVIEW_ACTIVITY_ID);
  const opening = await openingFor(
    owner,
    quota.grant,
    { name, memory: EMPTY_MEMORY },
    { buddy, activity },
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createProjectWithChat(owner, name, {
    buddy,
    activity,
    opening,
  });
  return { kind: "started", chat };
}

export type { NewChatChoice, StartChatResult };
export { startChat, startProject };
