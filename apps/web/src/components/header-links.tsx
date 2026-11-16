import type { JSX } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import {
  headerBreadcrumbs,
  publicBreadcrumbs,
} from "@/components/header-breadcrumbs.ts";
import { QuestTitle } from "@/components/quest-title.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";
import { TimerTrailTools } from "@/components/timer/timer-trail-tools.tsx";

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
    ({ quest, timer, ...item }) => {
      if (quest !== undefined) {
        return { ...item, action: <QuestTitle quest={quest} /> };
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
