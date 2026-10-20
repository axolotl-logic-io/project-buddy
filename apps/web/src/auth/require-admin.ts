import { notFound } from "next/navigation";
import type { User } from "@/accounts/users-store.ts";
import { requireUser } from "@/auth/current-user.ts";

// Both the page and its action recheck the current session and stored role.
async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}

export { requireAdmin };
