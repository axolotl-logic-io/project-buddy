import type { Route } from "next";
import { connection } from "next/server";
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
import { HOME_COPY } from "@/ui/copy/home.ts";
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

const HOME: Breadcrumb & { readonly href: Route } = {
  label: HOME_COPY.heading,
  href: "/",
};
const QUESTS: Breadcrumb & { readonly href: Route } = {
  label: QUESTS_COPY.heading,
  href: "/quests",
};
const GRIMOIRE: Breadcrumb & { readonly href: Route } = {
  label: GRIMOIRE_COPY.heading,
  href: "/grimoire",
};
const TIMER_ROOT: Breadcrumb & { readonly href: Route } = {
  label: TIMER_COPY.heading,
  href: TIMER_PATH,
};

const ROOTS: ReadonlyMap<string, Breadcrumb & { readonly href: Route }> =
  new Map([
    ["quests", QUESTS],
    ["constructs", QUESTS],
    ["grimoire", GRIMOIRE],
    ["profile", { label: PROFILE_COPY.heading, href: "/profile" }],
    ["settings", { label: SETTINGS_COPY.heading, href: "/settings" }],
  ]);

// The sections whose trails start at Home for a signed-in user. Profile
// and Settings stand alone.
const UNDER_HOME: ReadonlySet<Breadcrumb> = new Set([QUESTS, GRIMOIRE]);

// A timer link's trail: the Timer, then the schedule it names. Once the
// schedule has started, its crumb carries it for the band's timer tools; a
// link whose start is still ahead shows no countdown, so it gets none.
// Whether it has started is read at the request, never in a prerender.
async function timerLinkBreadcrumbs(
  root: Breadcrumb,
  path: readonly string[],
): Promise<readonly HeaderBreadcrumb[]> {
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
  await connection();
  if (timerPhaseAt(schedule, Date.now()).kind === "not-started") {
    return [root, { label }];
  }
  return [root, { label, timer: schedule }];
}

// The trail of a page anyone may open, signed in or not: the Timer's setup
// and its links. Any other path has none.
async function publicBreadcrumbs(
  path: readonly string[],
): Promise<readonly HeaderBreadcrumb[]> {
  const [section, id] = path;
  if (section !== "timer") {
    return [];
  }
  if (id === undefined) {
    return [{ label: TIMER_ROOT.label }];
  }
  return await timerLinkBreadcrumbs(TIMER_ROOT, path);
}

// A signed-in user's trail: Home, then Quests, the Grimoire or the Timer
// and what is open under it. Profile and Settings stand alone.
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
    const trail = await publicBreadcrumbs(path);
    if (trail.length === 0) {
      return trail;
    }
    return [HOME, ...trail];
  }
  if (path.length === 0) {
    return [{ label: HOME.label }];
  }
  const root = ROOTS.get(section);
  if (id === undefined) {
    if (root === undefined) {
      return [];
    }
    if (UNDER_HOME.has(root)) {
      return [HOME, { label: root.label }];
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
    if (quest.status === "active") {
      return [
        HOME,
        QUESTS,
        { ...crumb, construct: getConstruct(quest.constructId) },
      ];
    }
    return [HOME, QUESTS, crumb];
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
  return [HOME, root, { label: name }];
}

export type { HeaderBreadcrumb };
export { headerBreadcrumbs, publicBreadcrumbs };
