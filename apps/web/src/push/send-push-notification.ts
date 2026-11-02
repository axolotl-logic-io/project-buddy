// Push notifications: sends one to every browser where a user turned
// notifications on. The only module that speaks the Web Push protocol: it
// encrypts each notification for its browser and signs it with the site's
// VAPID keys (web-push builds the request), then posts it to the browser's
// push service. The service worker (public/sw.js) shows it and, on a tap,
// opens its page.
import { generateRequestDetails } from "web-push";
import { readVapidKeysIfSet } from "@/env.ts";
import { logPushFailure } from "@/errors/error-log.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { UserId } from "@/ids.ts";
import {
  forgetPushSubscription,
  pushSubscriptionsOf,
  type SavedPushSubscription,
} from "@/push/push-subscriptions.ts";
import { HOME_PATH } from "@/routes.ts";

// A notification: its title and text, and the site path a tap on it opens,
// such as "/chats/new".
interface PushNotification {
  readonly title: string;
  readonly body: string;
  readonly url: string;
}

// What happened to a notification at one browser's push service.
type Delivery = "delivered" | "gone" | "failed";

// How long a push service keeps a notification for a browser that is
// offline: a day, after which it would be stale.
const TIME_TO_LIVE_SECONDS = 86_400;

// A deadline for each push service's answer, so one slow service can't
// hold up the request that sends.
const PUSH_SERVICE_TIMEOUT_MS = 10_000;

// The statuses with which a push service says the subscription has expired
// or was removed (RFC 8030): it will never deliver to it again.
const GONE_STATUSES: ReadonlySet<number> = new Set([
  HTTP_STATUS.notFound,
  HTTP_STATUS.gone,
]);

// url when it is a path on this site, or the home page. A notification can
// only open the site's own pages.
function sitePath(url: string): string {
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }
  return HOME_PATH;
}

// Posts the notification to one browser's push service and reports what
// the service said. A failure is logged, never thrown.
async function deliver(
  subscription: SavedPushSubscription,
  payload: string,
  vapidDetails: NonNullable<ReturnType<typeof readVapidKeysIfSet>>,
): Promise<Delivery> {
  const request = generateRequestDetails(subscription, payload, {
    vapidDetails,
    TTL: TIME_TO_LIVE_SECONDS,
  });
  const { host } = new URL(request.endpoint);
  let response: Response;
  try {
    response = await fetch(request.endpoint, {
      method: request.method,
      headers: request.headers,
      body: Uint8Array.from(request.body ?? []),
      signal: AbortSignal.timeout(PUSH_SERVICE_TIMEOUT_MS),
    });
  } catch (error) {
    logPushFailure("unreachable", "sendPushNotification", { host, error });
    return "failed";
  }
  if (response.ok) {
    return "delivered";
  }
  if (GONE_STATUSES.has(response.status)) {
    return "gone";
  }
  logPushFailure("refused", "sendPushNotification", {
    host,
    status: response.status,
  });
  return "failed";
}

// Sends the notification to every browser where the user turned
// notifications on, and returns how many push services took it. A browser
// whose push service says it is gone is forgotten. A url that isn't a path
// on this site opens the home page instead. With no VAPID keys set, the
// site sends nothing and this returns 0.
async function sendPushNotification(
  userId: UserId,
  notification: PushNotification,
): Promise<number> {
  const vapidDetails = readVapidKeysIfSet();
  if (vapidDetails === undefined) {
    return 0;
  }
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: sitePath(notification.url),
  });
  const subscriptions = await pushSubscriptionsOf(userId);
  const deliveries = await Promise.all(
    subscriptions.map(async (subscription) => {
      const delivery = await deliver(subscription, payload, vapidDetails);
      if (delivery === "gone") {
        await forgetPushSubscription(userId, subscription.endpoint);
      }
      return delivery;
    }),
  );
  return deliveries.filter((delivery) => delivery === "delivered").length;
}

export type { PushNotification };
export { sendPushNotification };
