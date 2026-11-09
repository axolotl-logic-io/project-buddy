import type { Route } from "next";
import { getOwnActivity } from "@/activities/activity-store.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import { getChat } from "@/chats/store.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { getOwnConstruct } from "@/constructs/construct-store.ts";
import { getConstruct, isConstructId } from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import { getListing } from "@/marketplace/listing-store.ts";
import { readProjectInvitation } from "@/projects/project-invitations.ts";
import { getProject } from "@/projects/store.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import {
  CHAT_NAME_COPY,
  NEW_CHAT_COPY,
  STANDALONE_CHATS_COPY,
} from "@/ui/copy/chat.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { PROJECT_INVITATION_COPY } from "@/ui/copy/project-invitations.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

const DETAIL_DEPTH = 2;
const CHILD_DEPTH = 3;

const HOME: Breadcrumb = { label: SITE_COPY.home, href: "/home" };
const QUESTS: Breadcrumb = {
  label: PROJECTS_COPY.allProjectsLink,
  href: "/projects",
};
const ADVENTURES: Breadcrumb = {
  label: STANDALONE_CHATS_COPY.backLink,
  href: "/chat",
};
const ROOTS: ReadonlyMap<string, Breadcrumb & { readonly href: Route }> =
  new Map([
    ["projects", { label: PROJECTS_COPY.heading, href: "/projects" }],
    ["chat", { label: STANDALONE_CHATS_COPY.heading, href: "/chat" }],
    ["constructs", { label: CONSTRUCTS_COPY.heading, href: "/constructs" }],
    ["activities", { label: ACTIVITIES_COPY.heading, href: "/activities" }],
    ["spellbook", { label: SPELLBOOK_COPY.heading, href: "/spellbook" }],
    ["workshop", { label: WORKSHOP_COPY.heading, href: "/workshop" }],
    ["marketplace", { label: MARKETPLACE_COPY.heading, href: "/marketplace" }],
    ["retirement", { label: RETIREMENT_COPY.heading, href: "/retirement" }],
    ["gallery", { label: GENERATION_COPY.heading, href: "/gallery" }],
    ["settings", { label: SETTINGS_COPY.heading, href: "/settings" }],
    ["account", { label: ACCOUNT_COPY.heading, href: "/account" }],
    ["capture", { label: QUICK_CAPTURE_COPY.heading, href: "/capture" }],
    ["invitations", { label: INVITATIONS_COPY.heading, href: "/invitations" }],
  ]);

// Resolve names only through the same acting-user stores as the page. Unknown
// or inaccessible destinations expose no trail. The header slot calls this on
// each matched navigation, including history restoration, rather than keeping
// page registrations in client state.
async function headerBreadcrumbs(
  user: UserId,
  path: readonly string[],
): Promise<readonly Breadcrumb[]> {
  const [section = "", id, child] = path;
  const root = ROOTS.get(section);
  if (id === undefined) {
    if (root === undefined) {
      return [];
    }
    return [HOME, { label: root.label }];
  }
  if (section === "chats") {
    if (id === "new") {
      return [HOME, QUESTS, { label: NEW_CHAT_COPY.heading }];
    }
    if (path.length !== DETAIL_DEPTH) {
      return [];
    }
    const chat = await getChat(user, id);
    if (chat === undefined) {
      return [];
    }
    const parents: Breadcrumb[] = [HOME];
    if (chat.project === undefined) {
      parents.push(ADVENTURES);
    } else {
      parents.push(QUESTS, {
        label: chat.project.name,
        href: `/projects/${chat.project.id}`,
      });
    }
    return [...parents, { label: chat.name ?? CHAT_NAME_COPY.fallback }];
  }
  if (section === "projects") {
    if (
      id === "invitations" &&
      child !== undefined &&
      path.length === CHILD_DEPTH
    ) {
      const invitation = await readProjectInvitation(user, child);
      if (invitation === undefined) {
        return [];
      }
      return [
        HOME,
        QUESTS,
        { label: PROJECT_INVITATION_COPY.question(invitation.project.name) },
      ];
    }
    if (
      path.length > CHILD_DEPTH ||
      (child !== undefined && child !== "memory")
    ) {
      return [];
    }
    const project = await getProject(user, id);
    if (project === undefined) {
      return [];
    }
    if (child === "memory") {
      return [
        HOME,
        QUESTS,
        { label: project.name, href: `/projects/${project.id}` },
        { label: MEMORY_COPY.heading },
      ];
    }
    return [HOME, QUESTS, { label: project.name }];
  }
  if (root === undefined || path.length !== DETAIL_DEPTH) {
    return [];
  }
  let name: string | undefined;
  if (section === "constructs") {
    if (isConstructId(id)) {
      ({ name } = getConstruct(id));
    } else {
      name = (await getOwnConstruct(user, id))?.name;
    }
  } else if (section === "activities") {
    if (isActivityId(id)) {
      ({ name } = getActivity(id));
    } else {
      name = (await getOwnActivity(user, id))?.name;
    }
  } else if (section === "spellbook") {
    if (isSpellId(id)) {
      ({ name } = getSpell(id));
    } else {
      name = (await getOwnSpell(user, id))?.name;
    }
  } else if (section === "marketplace") {
    name = (await getListing(user, id))?.name;
  } else if (section === "retirement") {
    name = (await getRetiredDefinition(user, id))?.name;
  }
  if (name === undefined) {
    return [];
  }
  return [HOME, root, { label: name }];
}

export { headerBreadcrumbs };
