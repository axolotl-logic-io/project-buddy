// `mise run sign-in-link [EMAIL]`: prints a sign-in link to the development
// site for EMAIL, or the developer account, making the account if it's
// missing. The task migrates this branch's development database first.
import process from "node:process";
import { localDatabase } from "./db/database-names.ts";
import { createSignInLink } from "./development/sign-in-link.ts";
import { linkEmail } from "./development/sign-in-link-token.ts";
import { reportFailure } from "./development/steps.ts";

async function signInLink(address?: string): Promise<URL> {
  const email = linkEmail(address);
  const { PROJECT_BUDDY_URL = "http://localhost:3000" } = process.env;
  return await createSignInLink(
    localDatabase("dev").url,
    PROJECT_BUDDY_URL,
    email,
  );
}

const args = process.argv.slice(2);
if (args.length > 1) {
  reportFailure(new Error("Usage: mise run sign-in-link [EMAIL]"));
} else {
  await signInLink(args[0])
    .then((link) => console.log(link.href))
    .catch(reportFailure);
}
