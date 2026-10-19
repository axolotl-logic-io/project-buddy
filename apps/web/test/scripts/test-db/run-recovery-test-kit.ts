import {
  groupHasProcesses,
  isProcessAlive,
} from "../../../scripts/test-db/run-ownership.ts";
import { waitUntil } from "../../../scripts/test-db/run-protocol.ts";
import { ownershipMembers } from "./fake-run-database.ts";

const TIMEOUT_MS = 25_000;
// OS disappearance has no event for orphaned grandchildren. This poll waits
// with a deadline; neither the journal nor the snapshot authorizes any signal.
async function ownedProcessesEnded(database: string): Promise<void> {
  const members = await ownershipMembers(database);
  await waitUntil(
    () =>
      members.every(
        ({ pid, group }) =>
          !(isProcessAlive(pid) || (group && groupHasProcesses(pid))),
      ),
    "abandoned invocation processes",
    TIMEOUT_MS,
  );
}

export { ownedProcessesEnded };
