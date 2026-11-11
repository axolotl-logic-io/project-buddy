// Starting a chat, in a project, in none, or in a new project: the construct's
// opening (src/replies/chat-opening.ts) comes first, then the chat is saved
// with it as its first message, so the user finds the construct already
// speaking. A built-in construct in a built-in activity has a prepared opening,
// so the chat starts at once, without Claude. Otherwise the construct writes
// its opening, as the chat's activity asks, which takes as long as Claude
// takes, up to the opening's timeout; when Claude can't write it, nothing
// is saved: no chat, and no new project. Once the owner is out of gold
// (src/quota/quota.ts), nothing is saved either. The rows are saved
// together, in one transaction, so a failure leaves no chat without its
// opening and no project without its chat. Superseded by one continuing
// conversation per quest (src/conversations/); removed with its last
// consumer, the new-adventure form.

import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import { interviewOpeningRequest } from "@/activities/interview.ts";
import type { Chat, ChatProject } from "@/chats/chat-rows.ts";
import {
  createChatWithOpening,
  type NewChatConstruct,
} from "@/chats/new-chat-store.ts";
import { openingFor } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { checkGold } from "@/quota/quota.ts";
import {
  type PromptProject,
  readPromptProject,
} from "@/replies/system-prompt.ts";

// The chat, saved with its opening, or why nothing was saved: Claude is
// unavailable to write the opening, or the owner is out of gold.
type StartChatResult<Started extends Chat = Chat> =
  | { readonly kind: "started"; readonly chat: Started }
  | { readonly kind: "claudeUnavailable" }
  | { readonly kind: "outOfGold" };

const CLAUDE_UNAVAILABLE = { kind: "claudeUnavailable" } as const;
const OUT_OF_GOLD = { kind: "outOfGold" } as const;

// What a new chat starts with: its project, or none for a standalone chat,
// its construct, which the chat keeps as it is now, with any {{name}} as
// written, and its first activity, which sets how the construct opens it.
interface NewChatChoice {
  readonly project: Project | undefined;
  readonly construct: NewChatConstruct;
  readonly activity: ChatActivity;
}

// The project as a new chat's prompt reads it, with the owner's memory and
// newest milestones as they are now; undefined for a standalone chat.
function promptProjectOf(
  owner: UserId,
  project: ChatProject | undefined,
): Promise<PromptProject | undefined> {
  if (project === undefined) {
    return Promise.resolve(undefined);
  }
  return readPromptProject(owner, project);
}

// A new chat of the owner's, as choice says. A storage failure throws, and
// so does a project of another user's, as not found.
async function startChat(
  owner: UserId,
  choice: NewChatChoice,
): Promise<StartChatResult> {
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const project = await promptProjectOf(owner, choice.project);
  let kickoff: string | undefined;
  if (project !== undefined && choice.activity.id === INTERVIEW_ACTIVITY_ID) {
    kickoff = interviewOpeningRequest(project.memory);
  }
  const opening = await openingFor(
    owner,
    gold.grant,
    () => Promise.resolve(project),
    {
      ...choice,
      kickoff,
    },
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createChatWithOpening(owner, choice, opening);
  return { kind: "started", chat };
}

export type { NewChatChoice, StartChatResult };
export { startChat };
