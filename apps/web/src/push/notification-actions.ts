"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { readVapidKeysIfSet } from "@/env.ts";
import {
  forgetPushSubscription,
  parsePushSubscription,
  restorePushSubscription,
  savePushSubscription,
} from "@/push/push-subscriptions.ts";
import { sendPushNotification } from "@/push/send-push-notification.ts";
import { SETTINGS_PATH } from "@/routes.ts";
import { NOTIFICATIONS_COPY } from "@/ui/copy/settings.ts";

const ENDPOINT = z.string();

// Whether notifications are on for the site: only once its VAPID keys are
// set. Until then Settings hides them, and turning them on, restoring them
// or sending a test notification is refused.
function notificationsAreOn(): boolean {
  return readVapidKeysIfSet() !== undefined;
}

// Turns notifications on for the browser that sent subscription, the
// result of its PushSubscription.toJSON(), by saving it to her account.
// "refused" means the subscription is malformed or names a push service the
// site doesn't send to, or that the site has no VAPID keys. Saving the same
// subscription again is harmless.
export async function turnOnNotificationsAction(
  subscription: unknown,
): Promise<"saved" | "refused"> {
  const user = await requireUser();
  if (!notificationsAreOn()) {
    return "refused";
  }
  const parsed = parsePushSubscription(subscription);
  if (parsed === undefined) {
    return "refused";
  }
  await savePushSubscription(user.id, parsed);
  return "saved";
}

// Where notifications stand for the browser that sent subscription, the
// result of its PushSubscription.toJSON(), when Settings opens: "on" when it
// is hers, saving it first if the server had forgotten it. A subscription
// another user saved stays theirs, and reads as "off" here until she turns
// notifications on herself. Without the site's VAPID keys, it is "off".
export async function restoreNotificationsAction(
  subscription: unknown,
): Promise<"on" | "off"> {
  const user = await requireUser();
  if (!notificationsAreOn()) {
    return "off";
  }
  const parsed = parsePushSubscription(subscription);
  if (parsed === undefined) {
    return "off";
  }
  if (await restorePushSubscription(user.id, parsed)) {
    return "on";
  }
  return "off";
}

// Turns notifications off for the browser whose subscription has this
// endpoint. Anything else, or an endpoint that isn't hers, changes nothing.
export async function turnOffNotificationsAction(
  endpoint: unknown,
): Promise<void> {
  const user = await requireUser();
  const parsed = ENDPOINT.safeParse(endpoint);
  if (parsed.success) {
    await forgetPushSubscription(user.id, parsed.data);
  }
}

// Sends her a test notification on every device where she turned
// notifications on, opening Settings when tapped. "sent" means at least one
// push service took it. Without the site's VAPID keys, nothing is sent.
export async function sendTestNotificationAction(): Promise<
  "sent" | "not-sent"
> {
  const user = await requireUser();
  if (!notificationsAreOn()) {
    return "not-sent";
  }
  const delivered = await sendPushNotification(user.id, {
    title: NOTIFICATIONS_COPY.testTitle,
    body: NOTIFICATIONS_COPY.testBody,
    url: SETTINGS_PATH,
  });
  if (delivered > 0) {
    return "sent";
  }
  return "not-sent";
}
