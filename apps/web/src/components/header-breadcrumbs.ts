import type { Route } from "next";
import { getOwnActivity } from "@/activities/activity-store.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { getOwnConstruct } from "@/constructs/construct-store.ts";
import { getConstruct, isConstructId } from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import { getProject } from "@/projects/store.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { workshopPath } from "@/routes.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { STANDALONE_CHAT_COPY } from "@/ui/copy/start-work.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

const DETAIL_DEPTH = 2;
const CHILD_DEPTH = 3;

const HOME: Breadcrumb = { label: SITE_COPY.home, href: "/home" };
const QUESTS: Breadcrumb = {
  label: PROJECTS_COPY.allProjectsLink,
  href: "/projects",
};
const ROOTS: ReadonlyMap<string, Breadcrumb & { readonly href: Route }> =
  new Map([
    ["projects", { label: PROJECTS_COPY.heading, href: "/projects" }],
    ["chat", { label: STANDALONE_CHAT_COPY.heading, href: "/chat" }],
    ["constructs", { label: CONSTRUCTS_COPY.heading, href: "/constructs" }],
    [
      "activities",
      { label: WORKSHOP_COPY.heading, href: workshopPath("activity") },
    ],
    ["spellbook", { label: SPELLBOOK_COPY.heading, href: "/spellbook" }],
    ["library", { label: LIBRARY_COPY.heading, href: "/library" }],
    ["workshop", { label: WORKSHOP_COPY.heading, href: "/workshop" }],
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
  if (section === "home" && id === undefined) {
    return [{ label: SITE_COPY.home }];
  }
  const root = ROOTS.get(section);
  if (id === undefined) {
    if (root === undefined) {
      return [];
    }
    return [HOME, { label: root.label }];
  }
  if (section === "projects") {
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
  if (section === "library") {
    const book = LIBRARY_COPY.books.find((candidate) => candidate.id === id);
    if (book === undefined) {
      return [];
    }
    return [HOME, root, { label: book.title }];
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
  } else if (section === "retirement") {
    name = (await getRetiredDefinition(user, id))?.name;
  }
  if (name === undefined) {
    return [];
  }
  return [HOME, root, { label: name }];
}

export { headerBreadcrumbs };
