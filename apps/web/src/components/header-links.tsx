import type { JSX } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { QuestTitle } from "@/components/quest-title.tsx";
import { SignedInLinks } from "@/components/site-header.tsx";

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
    breadcrumbs = resolved.map((item) => {
      if (item.quest === undefined) {
        return item;
      }
      return { ...item, action: <QuestTitle quest={item.quest} /> };
    });
  }
  return SignedInLinks({ breadcrumbs });
}

export { HeaderLinksAt };
