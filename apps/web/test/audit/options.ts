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
const PROFILE = z.enum(["desktop", "phone"]);
const OPTIONS = z.object({
  page: PAGE.optional(),
  profile: PROFILE.optional(),
  samples: z.coerce.number().int().positive().default(DEFAULT_SAMPLES),
  compare: z.string().min(1).optional(),
});
const RUN = OPTIONS.extend({ directory: z.string().min(1) });

type PageName = z.infer<typeof PAGE>;
type Profile = z.infer<typeof PROFILE>;

export type { PageName, Profile };
export { OPTIONS, PAGE, PROFILE, RUN };
