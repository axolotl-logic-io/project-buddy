// Local audit only. Each span owns its count; nested operations contribute
// to their ancestors, while concurrent sibling operations remain separate.

import { readServerSpans } from "../env.ts";
import { logServerSpan } from "../errors/error-log.ts";
import { type QueryCounter, queryCounters } from "./query-counter.ts";
import { SERVER_OPERATIONS, type ServerOperation } from "./server-span.ts";

// Preserves the operation's return value or error. Outputs only its static
// name, elapsed milliseconds and inclusive query count. Counts are not
// serial cost: simultaneous queries overlap within the elapsed duration.
function measureServerOperation<T>(
  operation: ServerOperation,
  work: () => Promise<T>,
  now: () => number = performance.now.bind(performance),
): Promise<T> {
  if (!readServerSpans()) {
    return work();
  }
  const name = SERVER_OPERATIONS.parse(operation);
  const counter: QueryCounter = { count: 0 };
  const start = now();
  return queryCounters.run(
    [...(queryCounters.getStore() ?? []), counter],
    async () => {
      try {
        return await work();
      } finally {
        logServerSpan({
          operation: name,
          durationMs: now() - start,
          queryCount: counter.count,
        });
      }
    },
  );
}

export { measureServerOperation };
