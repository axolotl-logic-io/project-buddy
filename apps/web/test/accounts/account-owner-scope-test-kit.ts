// Authentication reads accounts before a session exists; its limited exports
// are audited separately from private project and chat queries.
import { eq, type SQL } from "drizzle-orm";
import { loginLinks, users } from "@/db/tables/users.ts";
import { OWNER } from "./owner-scope-coverage-fixtures.ts";
import type { DataModule } from "./owner-scope-test-kit.ts";

// An account's own rows: the user's, and the sign-in links sent to them.
const OWN_ACCOUNT: readonly SQL[] = [
  eq(users.id, OWNER),
  eq(loginLinks.userId, OWNER),
];

const usersStore: typeof import("@/accounts/users-store.ts") = await import(
  "@/accounts/users-store.ts"
);
const loginLinkStore: typeof import("@/accounts/login-links.ts") = await import(
  "@/accounts/login-links.ts"
);

const invitationStore: typeof import("@/accounts/invitations.ts") =
  await import("@/accounts/invitations.ts");

const BEFORE_SIGN_IN =
  "signs in: finds the account by its address or a link's token, before anyone is signed in";

const ACCOUNT_DATA_MODULES: readonly DataModule[] = [
  {
    path: "src/accounts/users-store.ts",
    exports: usersStore,
    ownerPredicates: OWN_ACCOUNT,
    scoped: {
      readSessionUser: () => usersStore.readSessionUser(OWNER, 1),
      endEverySession: () => usersStore.endEverySession(OWNER),
      saveHiddenExtras: () => usersStore.saveHiddenExtras(OWNER, ["memory"]),
      saveUserName: () => usersStore.saveUserName(OWNER, "Mabel"),
      readUserName: () => usersStore.readUserName(OWNER),
      readPromptPreferences: () => usersStore.readPromptPreferences(OWNER),
    },
    unscoped: [
      [usersStore.findUserByEmail, BEFORE_SIGN_IN],
      [usersStore.normalizeEmail, "reads nothing: normalizes an address"],
    ],
  },
  {
    path: "src/accounts/login-links.ts",
    exports: loginLinkStore,
    ownerPredicates: OWN_ACCOUNT,
    scoped: {},
    unscoped: [
      [loginLinkStore.readLoginLinkUser, BEFORE_SIGN_IN],
      [loginLinkStore.requestLoginLink, BEFORE_SIGN_IN],
      [
        loginLinkStore.sendLoginLink,
        "emails a login link only to the stored account address; no private data is returned",
      ],
      [loginLinkStore.LOGIN_LINK_LIFETIME_MINUTES, "a constant"],
    ],
  },
  {
    path: "src/accounts/invitations.ts",
    exports: invitationStore,
    ownerPredicates: [],
    scoped: {},
    unscoped: [
      [
        invitationStore.sendInvitation,
        "admin-authorized action sends to a fixed email; no private account data returned",
      ],
      [
        invitationStore.readInvitation,
        "before sign-in: possession of a valid token identifies only its recipient",
      ],
      [
        invitationStore.acceptInvitation,
        "before sign-in: atomically consumes the fixed-address token and creates its account",
      ],
    ],
  },
];

export { ACCOUNT_DATA_MODULES };
