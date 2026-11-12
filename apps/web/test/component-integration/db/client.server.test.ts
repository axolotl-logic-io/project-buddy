import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { getDb, inTransaction } from "@/db/client.ts";
import { signInLinks, users } from "@/db/tables/users.ts";
import { databaseErrorCase, violatesForeignKey } from "@/errors/neon-errors.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

test("a transaction reads its own writes, commits, and rolls back on failure", async () => {
  const user = await testUser();
  await inTransaction(async (tx) => {
    await tx
      .update(users)
      .set({ name: "Committed" })
      .where(eq(users.id, user.id));
    const [saved] = await tx
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.id));
    expect(saved?.name).toBe("Committed");
  });
  const failure = new Error("Cancel this change");
  await expect(
    inTransaction(async (tx) => {
      await tx
        .update(users)
        .set({ name: "Rolled back" })
        .where(eq(users.id, user.id));
      throw failure;
    }),
  ).rejects.toBe(failure);
  const [saved] = await getDb()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, user.id));
  expect(saved?.name).toBe("Committed");
});

test("native PostgreSQL constraint errors keep their application case and foreign key", async () => {
  const failure = await getDb()
    .insert(signInLinks)
    .values({
      tokenHash: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      expiresAt: new Date(),
    })
    .then(
      () => undefined,
      (error: unknown) => error,
    );
  expect(failure).toBeDefined();
  expect(databaseErrorCase(failure)).toBe("database-query-failed");
  expect(violatesForeignKey(failure, "login_links_user_id_users_id_fk")).toBe(
    true,
  );
  expect(violatesForeignKey(failure, "another_constraint")).toBe(false);
});
