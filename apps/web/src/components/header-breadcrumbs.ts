import type { Route } from "next";
import type { User } from "@/accounts/users-store.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import {
  type Construct,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { readRite } from "@/rites/rite-store.ts";
import {
  parseTimerSchedule,
  TIMER_PATH,
  type TimerSchedule,
  timerPhaseAt,
} from "@/timer/schedule.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

interface HeaderBreadcrumb extends Breadcrumb {
  readonly quest?: Pick<Quest, "id" | "name">;
  readonly construct?: Construct;
  // A running timer's schedule, whose tools the band shows at its right.
  readonly timer?: TimerSchedule;
}

const DETAIL_DEPTH = 2;
const CHILD_DEPTH = 3;
// /timer/<work>/<break>/<start>.
const TIMER_LINK_DEPTH = 4;

const QUESTS: Breadcrumb & { readonly href: Route } = {
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
    ["constructs", QUESTS],
    ["grimoire", { label: GRIMOIRE_COPY.heading, href: "/grimoire" }],
    ["profile", { label: PROFILE_COPY.heading, href: "/profile" }],
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
    const crumb: HeaderBreadcrumb = {
      label: quest.name,
      quest: { id: quest.id, name: quest.name },
    };
    if (quest.dailies && quest.status === "active") {
      return [QUESTS, { ...crumb, construct: getConstruct(quest.constructId) }];
    }
    return [QUESTS, crumb];
  }
  if (root === undefined || path.length !== DETAIL_DEPTH) {
    return [];
  }
  let name: string | undefined;
  if (section === "constructs") {
    if (isConstructId(id)) {
      ({ name } = getConstruct(id));
    }
  } else if (section === "grimoire") {
    if (id === "new") {
      name = GRIMOIRE_COPY.create;
    } else {
      name = (await readRite(user.id, id, true))?.name;
    }
  }
  if (name === undefined) {
    return [];
  }
  return [root, { label: name }];
}

export { headerBreadcrumbs, publicBreadcrumbs };
