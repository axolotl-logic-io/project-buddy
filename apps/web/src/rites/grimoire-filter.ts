import { z } from "zod";

// The Grimoire's tabs: every rite available to perform, the built-in ones,
// the user's own, and the user's forgotten ones.
const GRIMOIRE_FILTER = z.enum(["all", "built-in", "own", "forgotten"]);
type GrimoireFilter = z.infer<typeof GRIMOIRE_FILTER>;

export type { GrimoireFilter };
export { GRIMOIRE_FILTER };
