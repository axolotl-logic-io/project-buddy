import { eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { marketplaceCutover } from "@/db/tables/orbs.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

// The global purchase gate is disabled until an operator approves the rollout.
async function orbPurchasesEnabled(): Promise<boolean> {
  const [row] = await withAppErrors("read Marketplace cutover", () =>
    getDb()
      .select({ enabled: marketplaceCutover.enabled })
      .from(marketplaceCutover)
      .where(eq(marketplaceCutover.id, 1)),
  );
  return row?.enabled === true;
}

export { orbPurchasesEnabled };
