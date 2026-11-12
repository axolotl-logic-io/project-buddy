import type { Route } from "next";
import type { User } from "@/accounts/users-store.ts";
import { getOwnActivity } from "@/activities/activity-store.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { getOwnConstruct } from "@/constructs/construct-store.ts";
import { getConstruct, isConstructId } from "@/constructs/index.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { workshopPath } from "@/routes.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { STANDALONE_CHAT_COPY } from "@/ui/copy/start-work.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

interface HeaderBreadcrumb extends Breadcrumb {
  readonly quest?: Pick<Quest, "id" | "name">;
}

const DETAIL_DEPTH = 2;
const CHILD_DEPTH = 3;

const QUESTS: Breadcrumb = {
  label: QUESTS_COPY.heading,
  href: "/quests",
};
const ROOTS: ReadonlyMap<string, Breadcrumb & { readonly href: Route }> =
  new Map([
    ["quests", { label: QUESTS_COPY.heading, href: "/quests" }],
    ["chat", { label: STANDALONE_CHAT_COPY.heading, href: "/chat" }],
    [
      "constructs",
      { label: WORKSHOP_COPY.heading, href: workshopPath("construct") },
    ],
    [
      "activities",
      { label: WORKSHOP_COPY.heading, href: workshopPath("activity") },
    ],
    [
      "spellbook",
      { label: WORKSHOP_COPY.heading, href: workshopPath("spell") },
    ],
    ["library", { label: LIBRARY_COPY.heading, href: "/library" }],
    ["workshop", { label: WORKSHOP_COPY.heading, href: "/workshop" }],
    ["retirement", { label: RETIREMENT_COPY.heading, href: "/retirement" }],
    ["settings", { label: SETTINGS_COPY.heading, href: "/settings" }],
    ["invitations", { label: INVITATIONS_COPY.heading, href: "/invitations" }],
  ]);

// Resolve names only through the same acting-user stores as the page. Unknown
// or inaccessible destinations, such as Invitations for anyone but an admin,
// expose no trail. The last item is the page's heading, so it is worded as
// the page names itself. The header slot calls this on
// each matched navigation, including history restoration, rather than keeping
// page registrations in client state.
async function headerBreadcrumbs(
  user: Pick<User, "id" | "role">,
  path: readonly string[],
): Promise<readonly HeaderBreadcrumb[]> {
  const [section = "", id, child] = path;
  const root = ROOTS.get(section);
  if (id === undefined) {
    if (
      root === undefined ||
      (section === "invitations" && user.role !== "admin")
    ) {
      return [];
    }
    if (section === "quests") {
      return [{ label: root.label }];
    }
    return [QUESTS, { label: root.label }];
  }
  if (section === "quests") {
    if (path.length > CHILD_DEPTH || child !== undefined) {
      return [];
    }
    const quest = await getQuest(user.id, id);
    if (quest === undefined) {
      return [];
    }
    return [
      QUESTS,
      { label: quest.name, quest: { id: quest.id, name: quest.name } },
    ];
  }
  if (root === undefined || path.length !== DETAIL_DEPTH) {
    return [];
  }
  if (section === "library") {
    const book = LIBRARY_COPY.books.find((candidate) => candidate.id === id);
    if (book === undefined) {
      return [];
    }
    return [QUESTS, root, { label: book.title }];
  }
  let name: string | undefined;
  if (section === "constructs") {
    if (isConstructId(id)) {
      ({ name } = getConstruct(id));
    } else {
      name = (await getOwnConstruct(user.id, id))?.name;
    }
  } else if (section === "activities") {
    if (isActivityId(id)) {
      ({ name } = getActivity(id));
    } else {
      name = (await getOwnActivity(user.id, id))?.name;
    }
  } else if (section === "spellbook") {
    if (isSpellId(id)) {
      ({ name } = getSpell(id));
    } else {
      name = (await getOwnSpell(user.id, id))?.name;
    }
  } else if (section === "retirement") {
    name = (await getRetiredDefinition(user.id, id))?.name;
  }
  if (name === undefined) {
    return [];
  }
  return [QUESTS, root, { label: name }];
}

export { headerBreadcrumbs };
