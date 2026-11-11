// Starting a premade quest: the one way every quest starts, from Dailies,
// Learn a thing, Make a thing or Do a thing (src/projects/premade.ts). Each
// is an ordinary quest with its conversation, its premade kept as its
// identity. Learn, Make and Do start a new quest every time, for as many
// goals as the user likes; Dailies resumes the user's one Dailies quest when
// they have it (src/conversations/dailies.ts). Choosing and previewing a
// premade quest call nothing here, so they save nothing and spend nothing.
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import type { NewChatConstruct } from "@/chats/new-chat-store.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { startProject } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import type { PremadeId } from "@/projects/premade.ts";
import type { ProjectName } from "@/projects/project-name.ts";

// The quest started, or resumed for Dailies, with its conversation, or why
// it wasn't: the user is out of batteries, or Claude couldn't write its
// opening. Nothing is saved then.
type StartPremadeQuestResult =
  | {
      readonly kind: "started" | "resumed";
      readonly chat: ProjectChat;
    }
  | { readonly kind: "outOfGold" }
  | { readonly kind: "claudeUnavailable" };

// What the user confirmed: the premade quest, its name and starting
// Journal, which they may have edited, why they want it, if they said, and
// the construct and activity it starts in.
interface PremadeQuestStart {
  readonly premade: PremadeId;
  readonly name: ProjectName;
  readonly journal: string;
  readonly motivation?: string;
  readonly construct: NewChatConstruct;
  readonly activity: ChatActivity;
}

// Starts the user's quest from a premade quest. A storage failure throws.
async function startPremadeQuest(
  user: UserId,
  start: PremadeQuestStart,
): Promise<StartPremadeQuestResult> {
  if (start.premade === "dailies") {
    return await startDailies(user, start);
  }
  return await startProject(user, start.name, start.construct, {
    journal: start.journal,
    motivation: start.motivation,
    activity: start.activity,
    premade: start.premade,
  });
}

export type { PremadeQuestStart, StartPremadeQuestResult };
export { startPremadeQuest };
