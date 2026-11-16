import type { Route } from "next";
import type { User } from "@/accounts/users-store.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { getOwnConstruct } from "@/constructs/construct-store.ts";
import { getConstruct, isConstructId } from "@/constructs/index.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { workshopPath } from "@/routes.ts";
import { findSpell } from "@/spells/own-spell-store.ts";
import { getSpell, SPELL_ID } from "@/spells/spell.ts";
import {
  parseTimerSchedule,
  TIMER_PATH,
  type TimerSchedule,
  timerPhaseAt,
} from "@/timer/schedule.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { WORKSHOP_COPY, WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";

interface HeaderBreadcrumb extends Breadcrumb {
  readonly quest?: Pick<Quest, "id" | "name">;
  // A running timer's schedule, whose tools the band shows at its right.
  readonly timer?: TimerSchedule;
}

const DETAIL_DEPTH = 2;
const CHILD_DEPTH = 3;
// /timer/<work>/<break>/<start>.
const TIMER_LINK_DEPTH = 4;

const QUESTS: Breadcrumb = {
  label: QUESTS_COPY.heading,
  href: "/quests",
};
const TIMER_ROOT: Breadcrumb & { readonly href: Route } = {
  label: TIMER_COPY.heading,
  href: TIMER_PATH,
};

const ROOTS: ReadonlyMap<string, Breadcrumb & { readonly href: Route }> =
  new Map([
    ["quests", { label: QUESTS_COPY.heading, href: "/quests" }],
    [
      "constructs",
      {
        label: WORKSHOP_PAGE_COPY.kinds.construct,
        href: workshopPath("construct"),
      },
    ],
    [
      "spellbook",
      { label: WORKSHOP_PAGE_COPY.kinds.spell, href: workshopPath("spell") },
    ],
    ["workshop", { label: WORKSHOP_COPY.heading, href: "/workshop" }],
    ["retirement", { label: RETIREMENT_COPY.heading, href: "/retirement" }],
    ["settings", { label: SETTINGS_COPY.heading, href: "/settings" }],
  ]);

// A timer link's trail: the Timer, then the schedule it names. Once the
// schedule has started, its crumb carries it for the band's timer tools; a
// link whose start is still ahead shows no countdown, so it gets none.
function timerLinkBreadcrumbs(
  root: Breadcrumb,
  path: readonly string[],
): readonly HeaderBreadcrumb[] {
  if (path.length !== TIMER_LINK_DEPTH) {
    return [];
  }
  const [, work, rest, start] = path;
  const schedule = parseTimerSchedule({ work, break: rest, start });
  if (schedule === undefined) {
    return [root, { label: TIMER_COPY.unknownTrail }];
  }
  const label = TIMER_COPY.scheduleName(
    schedule.workMinutes,
    schedule.breakMinutes,
  );
  if (timerPhaseAt(schedule, Date.now()).kind === "not-started") {
    return [root, { label }];
  }
  return [root, { label, timer: schedule }];
}

// The trail of a page anyone may open, signed in or not: the Timer's setup
// and its links. Any other path has none.
function publicBreadcrumbs(
  path: readonly string[],
): readonly HeaderBreadcrumb[] {
  const [section, id] = path;
  if (section !== "timer") {
    return [];
  }
  if (id === undefined) {
    return [{ label: TIMER_ROOT.label }];
  }
  return timerLinkBreadcrumbs(TIMER_ROOT, path);
}

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
  if (section === "timer") {
    return publicBreadcrumbs(path);
  }
  const root = ROOTS.get(section);
  if (id === undefined) {
    if (root === undefined) {
      return [];
    }
    return [{ label: root.label }];
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
  let name: string | undefined;
  if (section === "constructs") {
    if (isConstructId(id)) {
      ({ name } = getConstruct(id));
    } else {
      name = (await getOwnConstruct(user.id, id))?.name;
    }
  } else if (section === "spellbook") {
    const parsed = SPELL_ID.safeParse(id);
    if (parsed.success) {
      ({ name } = getSpell(parsed.data));
    } else {
      name = (await findSpell(user.id, id))?.name;
    }
  } else if (section === "retirement") {
    name = (await getRetiredDefinition(user.id, id))?.name;
  }
  if (name === undefined) {
    return [];
  }
  if (section === "constructs" || section === "spellbook") {
    return [
      { label: WORKSHOP_COPY.heading, href: "/workshop" },
      root,
      { label: name },
    ];
  }
  return [root, { label: name }];
}

export { headerBreadcrumbs, publicBreadcrumbs };
