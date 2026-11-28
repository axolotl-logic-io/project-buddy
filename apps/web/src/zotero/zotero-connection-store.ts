// Users' Zotero connections and the OAuth requests that become them, in
// Postgres. Each belongs to its user alone (src/accounts/owner-scope.ts).
// The API key stays in this module and src/zotero/: what pages read is a
// ZoteroConnection, which holds no key.
import { and, eq, type SQL, sql } from "drizzle-orm";
import {
  zoteroAuthorizationOwnedBy,
  zoteroConnectionOwnedBy,
  zoteroListOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import {
  zoteroAuthorizations,
  zoteroConnections,
  zoteroLists,
} from "@/db/tables/zotero.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";
import type { ZoteroAccess, ZoteroKey } from "./zotero-api.ts";

// How long a user has to approve access on Zotero's site.
const AUTHORIZATION_LIFETIME: SQL = sql`interval '1 hour'`;

// A user's Zotero connection, as their pages show it.
interface ZoteroConnection {
  readonly username: string;
  // Whether Project Buddy may change the library, as sending checkmark
  // changes does.
  readonly writeAccess: boolean;
}

// The connection with its key, for src/zotero/ alone.
interface ZoteroConnectionKey extends ZoteroConnection, ZoteroKey {}

function readZoteroConnection(
  owner: UserId,
): Promise<ZoteroConnection | undefined> {
  return withAppErrors("readZoteroConnection", async () => {
    const [row] = await getDb()
      .select({
        username: zoteroConnections.username,
        writeAccess: zoteroConnections.writeAccess,
      })
      .from(zoteroConnections)
      .where(zoteroConnectionOwnedBy(owner));
    return row;
  });
}

function readZoteroKey(
  owner: UserId,
): Promise<ZoteroConnectionKey | undefined> {
  return withAppErrors("readZoteroKey", async () => {
    const [row] = await getDb()
      .select({
        username: zoteroConnections.username,
        writeAccess: zoteroConnections.writeAccess,
        apiKey: zoteroConnections.apiKey,
        zoteroUserId: zoteroConnections.zoteroUserId,
      })
      .from(zoteroConnections)
      .where(zoteroConnectionOwnedBy(owner));
    return row;
  });
}

// Keeps an OAuth request while the user approves it on Zotero's site, in
// place of any earlier one of theirs.
function saveZoteroAuthorization(
  owner: UserId,
  request: {
    readonly token: string;
    readonly secret: string;
    readonly returnTo: string;
  },
): Promise<void> {
  return withAppErrors("saveZoteroAuthorization", () =>
    inTransaction(async (tx) => {
      await tx
        .delete(zoteroAuthorizations)
        .where(zoteroAuthorizationOwnedBy(owner));
      await tx
        .insert(zoteroAuthorizations)
        .values({ ...request, userId: owner });
    }),
  );
}

// The user's OAuth request for the token, which this ends, or undefined
// when they have none for it or it has expired.
function takeZoteroAuthorization(
  owner: UserId,
  token: string,
): Promise<{ readonly secret: string; readonly returnTo: string } | undefined> {
  return withAppErrors("takeZoteroAuthorization", async () => {
    const [row] = await getDb()
      .delete(zoteroAuthorizations)
      .where(
        and(
          eq(zoteroAuthorizations.token, token),
          zoteroAuthorizationOwnedBy(owner),
        ),
      )
      .returning({
        secret: zoteroAuthorizations.secret,
        returnTo: zoteroAuthorizations.returnTo,
        fresh: sql<boolean>`${zoteroAuthorizations.createdAt} > now() - ${AUTHORIZATION_LIFETIME}`,
      });
    if (row === undefined || !row.fresh) {
      return;
    }
    return { secret: row.secret, returnTo: row.returnTo };
  });
}

// Saves the user's connection with its key, in place of any earlier one,
// and answers the earlier key, which no longer serves.
function saveZoteroConnection(
  owner: UserId,
  apiKey: string,
  access: ZoteroAccess,
): Promise<string | undefined> {
  return withAppErrors("saveZoteroConnection", () =>
    inTransaction(async (tx) => {
      const [earlier] = await tx
        .select({ apiKey: zoteroConnections.apiKey })
        .from(zoteroConnections)
        .where(zoteroConnectionOwnedBy(owner))
        .for("update");
      const connection = {
        apiKey,
        zoteroUserId: access.zoteroUserId,
        username: access.username,
        writeAccess: access.write,
      };
      await tx
        .insert(zoteroConnections)
        .values({ ...connection, userId: owner })
        .onConflictDoUpdate({
          target: zoteroConnections.userId,
          set: { ...connection, connectedAt: sql`now()` },
        });
      if (earlier === undefined || earlier.apiKey === apiKey) {
        return;
      }
      return earlier.apiKey;
    }),
  );
}

// Ends the user's connection, if it still has the key, and marks the
// collections of the lists in quests they own unavailable until a sync
// reaches them again. Answers whether it ended one.
function endZoteroConnection(owner: UserId, apiKey: string): Promise<boolean> {
  return withAppErrors("endZoteroConnection", () =>
    inTransaction(async (tx) => {
      const ended = await tx
        .delete(zoteroConnections)
        .where(
          and(
            zoteroConnectionOwnedBy(owner),
            eq(zoteroConnections.apiKey, apiKey),
          ),
        )
        .returning({ zoteroUserId: zoteroConnections.zoteroUserId });
      const [connection] = ended;
      if (connection === undefined) {
        return false;
      }
      await tx
        .update(zoteroLists)
        .set({ unavailable: "access-ended" })
        .where(
          and(
            zoteroListOwnedBy(owner),
            eq(zoteroLists.zoteroUserId, connection.zoteroUserId),
          ),
        );
      return true;
    }),
  );
}

export type { ZoteroConnection, ZoteroConnectionKey };
export {
  endZoteroConnection,
  readZoteroConnection,
  readZoteroKey,
  saveZoteroAuthorization,
  saveZoteroConnection,
  takeZoteroAuthorization,
};
