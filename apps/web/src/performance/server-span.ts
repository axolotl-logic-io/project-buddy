// The one record a local audit span emits: a static operation name, elapsed
// milliseconds and an inclusive query count. The recorder writes it and the
// audit evidence validator reads it, so both share this schema.

import { z } from "zod";

const SERVER_OPERATIONS = z.enum([
  "current-user",
  "today",
  "home-summary",
  "workshop-options",
  "construct-metadata",
  "construct-data",
  "activity-metadata",
  "activity-data",
  "spell-metadata",
  "spell-data",
]);

const SERVER_SPAN = z.strictObject({
  operation: SERVER_OPERATIONS,
  durationMs: z.number().finite().nonnegative(),
  queryCount: z.number().int().nonnegative(),
});

type ServerOperation = z.infer<typeof SERVER_OPERATIONS>;
type ServerSpan = Readonly<z.infer<typeof SERVER_SPAN>>;

export type { ServerOperation, ServerSpan };
export { SERVER_OPERATIONS, SERVER_SPAN };
