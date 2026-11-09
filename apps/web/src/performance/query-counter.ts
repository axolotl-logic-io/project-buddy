// Async query attribution shared with database scripts outside Next.
import { AsyncLocalStorage } from "node:async_hooks";

interface QueryCounter {
  count: number;
}

const queryCounters = new AsyncLocalStorage<readonly QueryCounter[]>();

// Counts executions, including failed queries. Never accepts query input.
function countServerQuery(): void {
  for (const counter of queryCounters.getStore() ?? []) {
    counter.count += 1;
  }
}

export type { QueryCounter };
export { countServerQuery, queryCounters };
