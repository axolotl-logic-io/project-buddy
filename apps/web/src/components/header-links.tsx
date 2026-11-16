import type { JSX } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import {
  headerBreadcrumbs,
  publicBreadcrumbs,
} from "@/components/header-breadcrumbs.ts";
import { QuestTitle } from "@/components/quest-title.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";
import { TimerTrailTools } from "@/components/timer/timer-trail-tools.tsx";
import type { Conversation } from "@/conversations/conversation-store.ts";

// The active Dailies quest's construct at the right of the trail band,
// opposite the breadcrumbs, clear of the site panel that opens on the left.
function ConstructTrailTools({
  conversation,
}: {
  readonly conversation: Pick<Conversation, "id" | "construct">;
}): JSX.Element {
  return (
    <div className="construct-trail-tools">
      <AdventureCharacterHeader
        construct={conversation.construct}
        destination={{ kind: "adventure", id: conversation.id }}
      />
    </div>
  );
}

// Shared header rendering for explicit collection routes and the detail
// catch-all. A signed-out visitor gets the trail of a page anyone may open,
// such as a timer link's, and no other.
async function HeaderLinksAt({
  path,
}: {
  readonly path: readonly string[];
}): Promise<JSX.Element> {
  const user = await currentUser();
  const signedIn = user !== undefined;
  let resolved = publicBreadcrumbs(path);
  if (signedIn) {
    resolved = await headerBreadcrumbs(user, path);
  }
  const breadcrumbs: readonly Breadcrumb[] = resolved.map(
    ({ quest, conversation, timer, ...item }) => {
      if (quest !== undefined) {
        return {
          ...item,
          action: (
            <>
              <QuestTitle quest={quest} />
              {conversation !== undefined && (
                <ConstructTrailTools conversation={conversation} />
              )}
            </>
          ),
        };
      }
      if (timer !== undefined) {
        return {
          ...item,
          action: <TimerTrailTools schedule={timer} signedIn={signedIn} />,
        };
      }
      return item;
    },
  );
  return SignedInHeader({ breadcrumbs });
}

export { HeaderLinksAt };
