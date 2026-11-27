import { z } from "zod";

const DEFAULT_SAMPLES = 3;

const PAGE = z.enum([
  "login",
  "signup",
  "credits",
  "home",
  "quests",
  "overview",
  "grimoire",
  "rite",
  "construct",
  "timer",
  "profile",
  "settings",
]);
const ACTION = z.enum([
  "check-off-task",
  "undo-task-check-off",
  "increment-tally",
  "quick-add-task",
  "start-performance",
  "send-performance-message",
  "start-timer",
  "start-quest",
]);
const PROFILE = z.enum(["desktop", "phone"]);
const OPTIONS = z.object({
  page: PAGE.optional(),
  action: ACTION.optional(),
  performance: z.boolean().default(false),
  profile: PROFILE.optional(),
  samples: z.coerce.number().int().positive().optional(),
  compare: z.string().min(1).optional(),
});
const RUN = OPTIONS.extend({
  directory: z.string().min(1),
  samples: z.number().int().positive(),
});

function defaultSampleCount(performance: boolean): 1 | 3 {
  if (performance) {
    return 1;
  }
  return DEFAULT_SAMPLES;
}

type ActionName = z.infer<typeof ACTION>;
type PageName = z.infer<typeof PAGE>;
type Profile = z.infer<typeof PROFILE>;

export type { ActionName, PageName, Profile };
export { ACTION, defaultSampleCount, OPTIONS, PAGE, PROFILE, RUN };
