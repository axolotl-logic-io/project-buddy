import { eq } from "drizzle-orm";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { invitations } from "@/db/tables/invitations.ts";
import { users } from "@/db/tables/users.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const addresses: string[] = [];
const SETUP_LINK = /https?:\/\/\S+\/setup\?token=[\w-]+/u;

async function newRecipient(): Promise<string> {
  const user = await testUser();
  addresses.push(user.email);
  await getDb().delete(users).where(eq(users.id, user.id));
  return user.email;
}

async function adminUser(): Promise<User> {
  const user = await testUser();
  await getDb()
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, user.id));
  return { ...user, role: "admin" };
}

async function cleanInvitations(): Promise<void> {
  await Promise.all(
    addresses.splice(0).map(async (email: string): Promise<void> => {
      await getDb().delete(invitations).where(eq(invitations.email, email));
      await getDb().delete(users).where(eq(users.email, email));
    }),
  );
}

function setupToken(text: string): string {
  const [link = ""] = SETUP_LINK.exec(text) ?? [];
  return new URL(link).searchParams.get("token") ?? "";
}

function invitationForm(email: string): FormData {
  const data = new FormData();
  data.set("email", email);
  return data;
}

export {
  adminUser,
  cleanInvitations,
  invitationForm,
  newRecipient,
  setupToken,
};
