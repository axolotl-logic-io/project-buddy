// The review accounts: three accounts in this worktree's local development
// database that show the site empty, in typical use and crowded, for design
// reviews and screenshot comparisons. `mise run review-data` fills them
// (review-data.ts); the visual comparison tool (scripts/visual/) signs in as
// them.
//
// Each account's address is derived from a base address, so two people, or
// two runs with different data, don't share accounts: review@project-buddy.test
// gives review+empty@, review+typical@ and review+crowded@project-buddy.test.
// The base address itself is never used, so the developer account is safe.
//
// Importing this module registers the hook that lets plain Node import the
// site's modules (app-modules.ts). Runs after npm ci.
import "./app-modules.ts";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { localDevelopmentDatabase } from "./database.ts";
import { developmentDatabaseUrl, localSettings } from "./environment.ts";
import { createSessionToken } from "./session-token.ts";
import { linkEmail } from "./sign-in-link-token.ts";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// The setting the site reads its database from.
const DATABASE_SETTING = "DATABASE_URL";
const DEFAULT_BASE_EMAIL = "review@project-buddy.test";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ADDRESS = /^(?<local>[^@+]+)(?:\+[^@]*)?@(?<domain>.+)$/u;

const REVIEW_KINDS = ["empty", "typical", "crowded"] as const;
type ReviewKind = (typeof REVIEW_KINDS)[number];

// The names the accounts sign up with. The crowded account's is near the
// 60-character limit, so it wraps wherever a name is shown.
const REVIEW_NAMES: Readonly<Record<ReviewKind, string>> = {
  empty: "Fen Holloway",
  typical: "Mara Quill",
  crowded: "Wilhelmina Featherstonehaugh-Cholmondeley of Lower Wychwood",
};

interface ReviewAccount {
  readonly kind: ReviewKind;
  readonly email: string;
  readonly name: string;
}

// The three accounts derived from base, the default base without one.
function reviewAccounts(
  base: string = DEFAULT_BASE_EMAIL,
): readonly ReviewAccount[] {
  const groups = ADDRESS.exec(linkEmail(base))?.groups;
  const { local = "", domain = "" } = groups ?? {};
  if (local === "" || domain === "") {
    throw new Error(`"${base}" isn't an email address.`);
  }
  return REVIEW_KINDS.map((kind) => ({
    kind,
    email: `${local}+${kind}@${domain}`,
    name: REVIEW_NAMES[kind],
  }));
}

// Points the site's modules at this worktree's local development database
// and answers its URL and the session secret. Throws, before anything connects, unless
// DATABASE_URL is that database: never a hosted one, nor another worktree's.
function pointAtLocalDatabase(): {
  readonly databaseUrl: string;
  readonly sessionSecret: string;
} {
  const settings = localSettings(WEB_ROOT, process.env);
  const { DATABASE_URL = developmentDatabaseUrl(WEB_ROOT), SESSION_SECRET } =
    settings;
  const { url } = localDevelopmentDatabase(DATABASE_URL);
  if (SESSION_SECRET === undefined || SESSION_SECRET === "") {
    throw new Error("Run mise setup first: SESSION_SECRET is not set.");
  }
  process.env[DATABASE_SETTING] = url;
  return { databaseUrl: url, sessionSecret: SESSION_SECRET };
}

// A session cookie value for the account, signed with the secret, as the
// site signs one at sign-in; undefined when the account doesn't exist.
async function reviewSession(
  account: ReviewAccount,
  sessionSecret: string,
): Promise<string | undefined> {
  const { findUserByEmail } = await import("@/accounts/users-store.ts");
  const user = await findUserByEmail(account.email);
  if (user === undefined) {
    return undefined;
  }
  return createSessionToken(user, sessionSecret, new Date());
}

// The origin of url when it names this computer, else undefined: the review
// accounts are only ever used with the local site.
function loopbackOrigin(url: string): string | undefined {
  const parsed = URL.parse(url);
  if (parsed === null || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    return undefined;
  }
  return parsed.origin;
}

// Closes the site's database connections, so the script can exit.
async function closeAppDatabase(): Promise<void> {
  const { closeDb } = await import("@/db/client.ts");
  await closeDb();
}

export type { ReviewAccount, ReviewKind };
export {
  closeAppDatabase,
  loopbackOrigin,
  pointAtLocalDatabase,
  REVIEW_KINDS,
  reviewAccounts,
  reviewSession,
  WEB_ROOT,
};
