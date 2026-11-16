// Makes a sign-in link in the development database for `mise run
// sign-in-link [EMAIL]`, without the site or the email outbox. EMAIL defaults
// to the developer account that the project-buddy command uses. An address
// with no account gets one: the developer account is signed up and named
// Developer; any other is invited, so continuing from the link asks for a
// name, as sign-up does.
//
// The link is saved as src/accounts/sign-in-links.ts saves one: its token's
// hash in login_links, working for 30 minutes, with the user's expired links
// deleted. Runs after npm ci, so it may import pg.
import pg from "pg";
import { DEVELOPER_EMAIL, DEVELOPER_NAME } from "./environment.ts";
import {
  hashLinkToken,
  newLinkToken,
  signInLinkUrl,
} from "./sign-in-link-token.ts";

const CONNECTION_TIMEOUT_MS = 3000;

// The account's id, after making the account if it's missing.
async function accountFor(client: pg.Client, email: string): Promise<string> {
  let name: string | null = null;
  let accountState = "invited";
  if (email === DEVELOPER_EMAIL) {
    name = DEVELOPER_NAME;
    accountState = "signed_up";
  }
  await client.query(
    "INSERT INTO users (email, name, account_state) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
    [email, name, accountState],
  );
  const { rows } = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email],
  );
  const [row] = rows;
  if (row === undefined) {
    throw new Error("The account was not saved.");
  }
  return row.id;
}

// A new sign-in link at origin for the email, normalized by linkEmail.
async function createSignInLink(
  databaseUrl: string,
  origin: string,
  email: string,
): Promise<URL> {
  const token = newLinkToken();
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  try {
    await client.connect();
    await client.query("BEGIN");
    const userId = await accountFor(client, email);
    await client.query(
      "DELETE FROM login_links WHERE user_id = $1 AND expires_at <= now()",
      [userId],
    );
    await client.query(
      "INSERT INTO login_links (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
      [hashLinkToken(token), userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    // A database error may name the database URL; report only the step.
    throw new Error(
      "Could not save a sign-in link in the development database. Run mise run doctor to check it.",
      { cause: error },
    );
  } finally {
    await client.end();
  }
  return signInLinkUrl(origin, token);
}

export { createSignInLink };
