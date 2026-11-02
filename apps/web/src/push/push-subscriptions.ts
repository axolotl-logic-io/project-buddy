// The user's push subscriptions: one for each browser where she turned
// notifications on. The only module that knows the push_subscriptions table
// and which push endpoints the site accepts. A subscription comes from the
// browser as PushSubscription.toJSON() makes it, and is parsed here.
import { and, eq } from "drizzle-orm";
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
const SUBSCRIPTION = z.object({
  endpoint: z.url().max(ENDPOINT_MAX_LENGTH),
  keys: z.object({ p256dh: KEY, auth: KEY }),
});

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

// Saves the subscription as owner's, when owner turns notifications on.
// The endpoint belongs to one browser, so if another user had saved it, that
// user signed out there and owner signed in and turned notifications on: the
// browser is now owner's, and only owner's notifications go to it. Saving
// the same subscription again changes nothing.
async function savePushSubscription(
  owner: UserId,
  subscription: SavedPushSubscription,
): Promise<void> {
  const row = {
    userId: owner,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
  await getDb()
    .insert(pushSubscriptions)
    .values({ endpoint: subscription.endpoint, ...row })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: row });
}

// Saves the subscription as owner's if no one has saved it, and says
// whether it is owner's now. Unlike savePushSubscription, it never takes a
// subscription from another user: it restores one the server forgot, without
// the user turning notifications on.
async function restorePushSubscription(
  owner: UserId,
  subscription: SavedPushSubscription,
): Promise<boolean> {
  await getDb()
    .insert(pushSubscriptions)
    .values({
      endpoint: subscription.endpoint,
      userId: owner,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoNothing({ target: pushSubscriptions.endpoint });
  const owned = await getDb()
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, subscription.endpoint),
        pushSubscriptionOwnedBy(owner),
      ),
    );
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

export type { SavedPushSubscription };
export {
  forgetPushSubscription,
  parsePushSubscription,
  pushSubscriptionsOf,
  restorePushSubscription,
  savePushSubscription,
};
