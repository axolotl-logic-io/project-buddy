// The user's push subscriptions: one for each browser where she turned
// notifications on. The only module that knows the push_subscriptions table
// and which push endpoints the site accepts. A subscription comes from the
// browser as PushSubscription.toJSON() makes it, and is parsed here.
import { and, eq, ne, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { pushSubscriptionOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { pushSubscriptions } from "@/db/tables/push-subscriptions.ts";
import { readPushEndpoints } from "@/env.ts";
import type { UserId } from "@/ids.ts";

// A browser's push subscription: where its push service takes notifications
// for it, and its keys that encrypt them.
interface SavedPushSubscription {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}

// Push services' endpoints are well under this; the limit only keeps a
// forged request from storing a huge one.
const ENDPOINT_MAX_LENGTH = 2048;
// The browser's keys are a 65-byte public key and a 16-byte secret, as
// URL-safe base64; the limit is generous.
const KEY_MAX_LENGTH = 200;
const BASE64URL = /^[\w-]+=*$/u;

// The push services browsers subscribe with, by host: Chrome's and
// Android's (Firebase Cloud Messaging), Firefox's (Mozilla autopush),
// Safari's (Apple) and Edge's (Windows Push Notification Services). The site
// sends only to these, so a forged subscription can't make the server post
// to any other address, such as one inside its own network.
const PUSH_SERVICE_HOSTS: ReadonlySet<string> = new Set([
  "fcm.googleapis.com",
  "web.push.apple.com",
]);
const PUSH_SERVICE_DOMAINS: readonly string[] = [
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
];

// The tests' fake push service, which PUSH_ENDPOINTS "loopback" allows.
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

const KEY = z.string().max(KEY_MAX_LENGTH).regex(BASE64URL);
const KEYS = z.object({ p256dh: KEY, auth: KEY });
const SUBSCRIPTION = z.object({
  endpoint: z.url().max(ENDPOINT_MAX_LENGTH),
  keys: KEYS,
});
// What the service worker sends when the browser renews its subscription
// (public/sw.js): the old subscription's endpoint and keys, and the new
// subscription, checked by parsePushSubscription.
const RENEWAL = z.object({
  oldEndpoint: z.string().max(ENDPOINT_MAX_LENGTH),
  oldKeys: KEYS.optional(),
  subscription: z.unknown(),
});

// A browser's renewed subscription, in place of its old one: the old
// endpoint, and the old keys when the browser still has them, which prove
// it held the old subscription.
interface PushSubscriptionRenewal {
  readonly oldEndpoint: string;
  readonly oldKeys: SavedPushSubscription["keys"] | undefined;
  readonly renewed: SavedPushSubscription;
}

// Whether url is one of the known push services, over https on its
// default port, with no user name or password.
function isPushService(url: URL): boolean {
  const { hostname } = url;
  return (
    url.protocol === "https:" &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    (PUSH_SERVICE_HOSTS.has(hostname) ||
      PUSH_SERVICE_DOMAINS.some((domain) => hostname.endsWith(domain)))
  );
}

// Whether url is the tests' fake push service, which only a test
// environment allows (PUSH_ENDPOINTS "loopback", refused in production).
function isTestPushService(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    LOOPBACK_HOSTS.has(url.hostname) &&
    readPushEndpoints() === "loopback"
  );
}

// Whether the site sends notifications to endpoint: one of the known push
// services, or in the tests, their fake push service.
function isAcceptedEndpoint(endpoint: string): boolean {
  const url = new URL(endpoint);
  return isPushService(url) || isTestPushService(url);
}

// The subscription a browser sent, or undefined when it is malformed or
// names an endpoint the site doesn't send to.
function parsePushSubscription(
  value: unknown,
): SavedPushSubscription | undefined {
  const parsed = SUBSCRIPTION.safeParse(value);
  if (!(parsed.success && isAcceptedEndpoint(parsed.data.endpoint))) {
    return undefined;
  }
  return parsed.data;
}

// The renewal the service worker sent, or undefined when it is malformed
// or its new subscription names an endpoint the site doesn't send to.
function parsePushSubscriptionRenewal(
  value: unknown,
): PushSubscriptionRenewal | undefined {
  const parsed = RENEWAL.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }
  const renewed = parsePushSubscription(parsed.data.subscription);
  if (renewed === undefined) {
    return undefined;
  }
  return {
    oldEndpoint: parsed.data.oldEndpoint,
    oldKeys: parsed.data.oldKeys,
    renewed,
  };
}

// Saves the subscription as owner's, held by the browser device names, when
// owner turns notifications on. The endpoint belongs to one browser, so if
// another user had saved it, owner signed in there and turned notifications
// on: the browser is now owner's, and only owner's notifications go to it.
// Saving the same subscription again changes nothing.
async function savePushSubscription(
  owner: UserId,
  subscription: SavedPushSubscription,
  device: string,
): Promise<void> {
  const row = {
    userId: owner,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    device,
  };
  await getDb()
    .insert(pushSubscriptions)
    .values({ endpoint: subscription.endpoint, ...row })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: row });
}

// Saves the subscription as owner's, held by the browser device names, if
// no one has saved it, and says whether it is owner's now. Unlike
// savePushSubscription, it never takes a subscription from another user: it
// restores one the server forgot, without the user turning notifications
// on. An owner's row it finds is marked as device's, since that browser
// holds it.
async function restorePushSubscription(
  owner: UserId,
  subscription: SavedPushSubscription,
  device: string,
): Promise<boolean> {
  await getDb()
    .insert(pushSubscriptions)
    .values({
      endpoint: subscription.endpoint,
      userId: owner,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      device,
    })
    .onConflictDoNothing({ target: pushSubscriptions.endpoint });
  const owned = await getDb()
    .update(pushSubscriptions)
    .set({ device })
    .where(
      and(
        eq(pushSubscriptions.endpoint, subscription.endpoint),
        pushSubscriptionOwnedBy(owner),
      ),
    )
    .returning({ endpoint: pushSubscriptions.endpoint });
  return owned.length > 0;
}

// Deletes owner's subscription with this endpoint. An endpoint owner has
// no subscription for, another user's included, changes nothing.
async function forgetPushSubscription(
  owner: UserId,
  endpoint: string,
): Promise<void> {
  await getDb()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        pushSubscriptionOwnedBy(owner),
      ),
    );
}

// Deletes the subscriptions that the browser device names holds, when its
// user signs out there, or those of every user but keep, when keep signs in
// there, so no one else's notifications go to it.
async function forgetPushSubscriptionsOfDevice(
  device: string,
  keep?: UserId,
): Promise<void> {
  let others: SQL | undefined;
  if (keep !== undefined) {
    others = ne(pushSubscriptions.userId, keep);
  }
  await getDb()
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.device, device), others));
}

// Deletes every subscription of owner's, when owner signs out everywhere.
async function forgetEveryPushSubscription(owner: UserId): Promise<void> {
  await getDb().delete(pushSubscriptions).where(pushSubscriptionOwnedBy(owner));
}

// Replaces the old subscription with the renewed one, for the same owner
// and browser, and says whether it did. Only a request that proves a right
// to the old subscription may: its owner, requester when signed in, or
// whoever sends its keys, which only its browser and the site know. The
// renewed endpoint must be the owner's or no one's, so a renewal never
// takes another user's subscription. A renewed endpoint the owner already
// has, as when Settings restored it first, takes the old row's place.
async function renewPushSubscription(
  { oldEndpoint, oldKeys, renewed }: PushSubscriptionRenewal,
  requester: UserId | undefined,
): Promise<boolean> {
  const proofs: SQL[] = [];
  if (requester !== undefined) {
    proofs.push(pushSubscriptionOwnedBy(requester));
  }
  if (oldKeys !== undefined) {
    const proof = and(
      eq(pushSubscriptions.p256dh, oldKeys.p256dh),
      eq(pushSubscriptions.auth, oldKeys.auth),
    );
    if (proof !== undefined) {
      proofs.push(proof);
    }
  }
  if (proofs.length === 0) {
    return false;
  }
  const old = and(eq(pushSubscriptions.endpoint, oldEndpoint), or(...proofs));
  const db = getDb();
  const [[owned], [taken]] = await Promise.all([
    db
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
      .where(old),
    db
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, renewed.endpoint)),
  ]);
  if (
    owned === undefined ||
    (taken !== undefined && taken.userId !== owned.userId)
  ) {
    return false;
  }
  const replace = db
    .update(pushSubscriptions)
    .set({
      endpoint: renewed.endpoint,
      p256dh: renewed.keys.p256dh,
      auth: renewed.keys.auth,
    })
    .where(and(old, eq(pushSubscriptions.userId, owned.userId)))
    .returning({ endpoint: pushSubscriptions.endpoint });
  if (taken === undefined || renewed.endpoint === oldEndpoint) {
    return (await replace).length > 0;
  }
  const [, replaced] = await db.batch([
    db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, renewed.endpoint),
          eq(pushSubscriptions.userId, owned.userId),
        ),
      ),
    replace,
  ]);
  return replaced.length > 0;
}

// Every subscription of owner's, oldest first.
async function pushSubscriptionsOf(
  owner: UserId,
): Promise<readonly SavedPushSubscription[]> {
  const rows = await getDb()
    .select()
    .from(pushSubscriptions)
    .where(pushSubscriptionOwnedBy(owner))
    .orderBy(pushSubscriptions.createdAt);
  return rows.map(({ endpoint, p256dh, auth }) => ({
    endpoint,
    keys: { p256dh, auth },
  }));
}

export type { PushSubscriptionRenewal, SavedPushSubscription };
export {
  forgetEveryPushSubscription,
  forgetPushSubscription,
  forgetPushSubscriptionsOfDevice,
  parsePushSubscription,
  parsePushSubscriptionRenewal,
  pushSubscriptionsOf,
  renewPushSubscription,
  restorePushSubscription,
  savePushSubscription,
};
