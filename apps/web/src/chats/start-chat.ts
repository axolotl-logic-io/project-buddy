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
// opening and no project without its chat. A check-in (startCheckIn) starts
// the same way, but the construct starts it on a schedule, not the user.
import { readUserName } from "@/accounts/users-store.ts";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import {
  builtInActivity,
  type ChatActivity,
} from "@/activities/chosen-activity.ts";
import {
  interviewOpeningRequest,
  newInterviewOpeningRequest,
} from "@/activities/interview.ts";
import {
  type Chat,
  type ChatProject,
  isProjectChat,
  type NewMessage,
  type ProjectChat,
} from "@/chats/chat-rows.ts";
import {
  createChatWithOpening,
  createProjectWithChat,
  type NewChatConstruct,
} from "@/chats/new-chat-store.ts";
import { latestConstruct, markChatUnreadFor } from "@/chats/store.ts";
import { CHECK_IN_KICKOFF } from "@/check-ins/check-in-kickoff.ts";
import {
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
  snapshotOf,
} from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import { EMPTY_MEMORY, MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { listProjectMembers } from "@/projects/members-store.ts";
import type { ProjectName } from "@/projects/project-name.ts";
import type { Project } from "@/projects/store.ts";
import { checkGold, type QuotaGrant } from "@/quota/quota.ts";
import { chatOpening } from "@/replies/chat-opening.ts";
import {
  type PromptProject,
  readPromptProject,
} from "@/replies/system-prompt.ts";
import { spellChoices } from "@/spells/spell-choices.ts";

// The chat, saved with its opening, or why nothing was saved: Claude is
// unavailable to write the opening, or the owner is out of gold.
type StartChatResult<Started extends Chat = Chat> =
  | { readonly kind: "started"; readonly chat: Started }
  | { readonly kind: "claudeUnavailable" }
  | { readonly kind: "outOfGold" };

const CLAUDE_UNAVAILABLE = { kind: "claudeUnavailable" } as const;
const OUT_OF_GOLD = { kind: "outOfGold" } as const;

// A check-in's chat, saved with its opening, whose text is message, or why
// nothing was saved.
type CheckInResult =
  | Exclude<StartChatResult, { readonly kind: "started" }>
  | {
      readonly kind: "started";
      readonly chat: ProjectChat;
      readonly message: string;
    };

// A message's text, its text parts one after another.
function messageText({ parts }: NewMessage): string {
  return parts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("\n\n");
}

// What a new chat starts with: its project, or none for a standalone chat,
// its construct, which the chat keeps as it is now, with any {{name}} as
// written, and its first activity, which sets how the construct opens it.
interface NewChatChoice {
  readonly project: Project | undefined;
  readonly construct: NewChatConstruct;
  readonly activity: ChatActivity;
}

// The opening of a chat of the owner's in project, with its memory as
// readProject reads it, or in none, in construct and activity, as kickoff asks
// for it if given, charged to grant if the construct writes it; undefined when
// Claude can't write it.
function openingFor(
  owner: UserId,
  grant: QuotaGrant,
  readProject: () => Promise<PromptProject | undefined>,
  {
    construct,
    activity,
    kickoff,
  }: Pick<NewChatChoice, "construct" | "activity"> & {
    readonly kickoff?: string | undefined;
  },
): ReturnType<typeof chatOpening> {
  return chatOpening({
    construct,
    activity,
    kickoff,
    grant,
    context: async () => {
      const [activities, spells, userName, project] = await Promise.all([
        activityChoices(owner),
        spellChoices(owner),
        readUserName(owner),
        readProject(),
      ]);
      return { activities, spells, project, userName };
    },
  });
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

// A new project of the owner's named name, with its first chat in the
// construct, which the chat keeps as it is now, in the project interview. A
// storage failure throws.
async function startProject(
  owner: UserId,
  name: ProjectName,
  construct: NewChatConstruct,
  motivation = "",
): Promise<StartChatResult<ProjectChat>> {
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const activity = builtInActivity(INTERVIEW_ACTIVITY_ID);
  let memory = EMPTY_MEMORY;
  const kickoff = newInterviewOpeningRequest(motivation);
  if (motivation !== "") {
    memory = { text: motivation, version: MEMORY_VERSION_NUMBER.parse(1) };
  }
  const opening = await openingFor(
    owner,
    gold.grant,
    () => Promise.resolve({ name, memory, milestones: [] }),
    { construct, activity, kickoff },
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createProjectWithChat(owner, name, {
    construct,
    activity,
    opening,
    motivation,
  });
  return { kind: "started", chat };
}

// A check-in on the owner's project: a new chat in the project, unread for
// the owner and every member, in the open chat with the construct of the project's newest chat
// (the default construct if it has none), which opens with the construct's message
// about where the user left off, written from the project's memory. The
// chat is marked unread (markChatUnreadFor) once it is saved. A storage
// failure throws, and so does a project of another user's, as not found.
async function startCheckIn(
  owner: UserId,
  project: ChatProject,
): Promise<CheckInResult> {
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const construct = (await latestConstruct(owner, project.id)) ?? {
    ...snapshotOf(getConstruct(DEFAULT_CONSTRUCT_ID)),
    id: DEFAULT_CONSTRUCT_ID,
  };
  const activity = builtInActivity(DEFAULT_ACTIVITY_ID);
  const opening = await openingFor(
    owner,
    gold.grant,
    () => readPromptProject(owner, project),
    { construct, activity, kickoff: CHECK_IN_KICKOFF },
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createChatWithOpening(
    owner,
    { project, construct, activity },
    opening,
  );
  const people = await listProjectMembers(owner, project.id);
  await markChatUnreadFor(chat.id, [owner, ...people.map(({ id }) => id)]);
  if (!isProjectChat(chat)) {
    throw new Error("A check-in's chat has no project");
  }
  return {
    kind: "started",
    chat: { ...chat, unread: true },
    message: messageText(opening),
  };
}

export type { CheckInResult, NewChatChoice, StartChatResult };
export { startChat, startCheckIn, startProject };
