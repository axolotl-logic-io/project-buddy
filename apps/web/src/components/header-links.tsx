import type { JSX } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { QuestTitle } from "@/components/quest-title.tsx";
import { SignedInHeader } from "@/components/site-header.tsx";
import { TimerTrailTools } from "@/components/timer/timer-trail-tools.tsx";

// Shared header rendering for explicit collection routes and the detail catch-all.
async function HeaderLinksAt({
  path,
}: {
  readonly path: readonly string[];
}): Promise<JSX.Element> {
  const user = await currentUser();
  let breadcrumbs: readonly Breadcrumb[] = [];
  if (user !== undefined) {
    const resolved = await headerBreadcrumbs(user, path);
    breadcrumbs = resolved.map(({ quest, timer, ...item }) => {
      if (quest !== undefined) {
        return { ...item, action: <QuestTitle quest={quest} /> };
      }
      if (timer !== undefined) {
        return { ...item, action: <TimerTrailTools schedule={timer} /> };
      }
      return item;
    });
  }
  return SignedInHeader({ breadcrumbs });
}

export { HeaderLinksAt };
