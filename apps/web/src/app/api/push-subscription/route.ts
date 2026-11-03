import { currentUser } from "@/auth/current-user.ts";
import { readVapidKeysIfSet } from "@/env.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  parsePushSubscriptionRenewal,
  renewPushSubscription,
} from "@/push/push-subscriptions.ts";

const JSON_CONTENT_TYPE = /^application\/json(?:;|$)/u;

// The site's VAPID public key, for the service worker to subscribe again
// with when the browser drops its subscription and the old one doesn't say
// its key. Without the site's VAPID keys, notifications are hidden and this
// answers 404.
export function GET(): Response {
  const vapidKeys = readVapidKeysIfSet();
  if (vapidKeys === undefined) {
    return appErrorResponse("not-found", HTTP_STATUS.notFound);
  }
  return Response.json({ publicKey: vapidKeys.publicKey });
}

// Replaces a browser's push subscription with the one it renewed to, from
// the service worker's pushsubscriptionchange (public/sw.js), keeping its
// owner. The JSON body names the old endpoint, the old keys if the browser
// still has them, and the new subscription. Only the old subscription's
// owner, signed in, or a request with its keys may replace it, and never
// with another user's endpoint (renewPushSubscription). It answers 204
// once replaced; 400 for a malformed body or an endpoint the site doesn't
// send to; and 404 when nothing was replaced, or the site has no VAPID
// keys, after which the service worker unsubscribes the new subscription.
// A JSON body can't come from a plain cross-site form.
export async function POST(request: Request): Promise<Response> {
  if (readVapidKeysIfSet() === undefined) {
    return appErrorResponse("not-found", HTTP_STATUS.notFound);
  }
  if (!JSON_CONTENT_TYPE.test(request.headers.get("content-type") ?? "")) {
    return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
  }
  const renewal = parsePushSubscriptionRenewal(body);
  if (renewal === undefined) {
    return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
  }
  const user = await currentUser();
  if (!(await renewPushSubscription(renewal, user?.id))) {
    return appErrorResponse("not-found", HTTP_STATUS.notFound);
  }
  return new Response(null, { status: HTTP_STATUS.noContent });
}
