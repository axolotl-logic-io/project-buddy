// Starting a chat, in a project, in none, or in a new project: the buddy's
// opening (src/replies/chat-opening.ts) comes first, then the chat is saved
// with it as its first message, so the user finds the buddy already
// speaking. A built-in buddy in a built-in activity has a prepared opening,
// so the chat starts at once, without Claude. Otherwise the buddy writes
// its opening, as the chat's activity asks, which takes as long as Claude
// takes, up to the opening's timeout; when Claude can't write it, nothing
// is saved: no chat, and no new project. Once the owner's monthly quota is
// used up (src/quota/quota.ts), nothing is saved either. The rows are saved
// together, in one transaction, so a failure leaves no chat without its
// opening and no project without its chat.
import { readUserName } from "@/accounts/users-store.ts";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import {
  builtInActivity,
  type ChatActivity,
} from "@/activities/chosen-activity.ts";
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
import { chatOpening } from "@/replies/chat-opening.ts";
import type { PromptProject } from "@/replies/system-prompt.ts";

// The chat, saved with its opening, or why nothing was saved: Claude is
// unavailable to write the opening, or the owner's quota is used up until
// resetsOn.
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

// The opening of a chat of the owner's in project, with its memory as
// readProject reads it, or in none, in buddy and activity, charged to grant
// if the buddy writes it; undefined when Claude can't write it.
function openingFor(
  owner: UserId,
  grant: QuotaGrant,
  readProject: () => Promise<PromptProject | undefined>,
  { buddy, activity }: Pick<NewChatChoice, "buddy" | "activity">,
): ReturnType<typeof chatOpening> {
  return chatOpening({
    buddy,
    activity,
    grant,
    context: async () => {
      const [activities, userName, project] = await Promise.all([
        activityChoices(owner),
        readUserName(owner),
        readProject(),
      ]);
      return { activities, project, userName };
    },
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
    () => projectWithMemory(owner, choice.project),
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
    () => Promise.resolve({ name, memory: EMPTY_MEMORY }),
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
