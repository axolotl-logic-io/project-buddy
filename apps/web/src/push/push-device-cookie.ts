// Which browser a push subscription is in, for the server: the
// push_device cookie names the browser with a random id, saved on each
// subscription it holds (src/push/push-subscriptions.ts). Signing out of
// the browser deletes its subscriptions by that id, so it needs no
// JavaScript in the page, and it still finds a subscription the service
// worker has renewed since. The id names the browser, not its user, so it
// outlives sessions. Every action that reads it sets it again with a fresh
// lifetime, so a browser in use never drops it.
import { cookies } from "next/headers";
import { z } from "zod";
import type { UserId } from "@/ids.ts";
import { forgetPushSubscriptionsOfDevice } from "@/push/push-subscriptions.ts";

const PUSH_DEVICE_COOKIE_NAME = "push_device";

// About 400 days, the longest a browser keeps a cookie.
const PUSH_DEVICE_MAX_AGE_SECONDS = 34_560_000;

const DEVICE_ID = z.uuid();

// This browser's id, or undefined when it has none, or a malformed one.
async function readThisBrowser(): Promise<string | undefined> {
  const parsed = DEVICE_ID.safeParse(
    (await cookies()).get(PUSH_DEVICE_COOKIE_NAME)?.value,
  );
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

// Sets this browser's id for another PUSH_DEVICE_MAX_AGE_SECONDS.
async function keepThisBrowser(device: string): Promise<void> {
  (await cookies()).set({
    name: PUSH_DEVICE_COOKIE_NAME,
    value: device,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: PUSH_DEVICE_MAX_AGE_SECONDS,
  });
}

// This browser's id, giving it one first if it has none, and keeping it
// for another PUSH_DEVICE_MAX_AGE_SECONDS. Only a Server Action or a route
// handler may call it, since it sets a cookie.
async function thisBrowser(): Promise<string> {
  const device = (await readThisBrowser()) ?? crypto.randomUUID();
  await keepThisBrowser(device);
  return device;
}

// Stops every user's notifications to this browser, when its user signs
// out of it, or every user's but keep's, when keep signs in to it. Keeps
// the browser's id for another PUSH_DEVICE_MAX_AGE_SECONDS, so it is there
// for the next sign-out. A browser with no id is left as it is.
async function stopNotificationsToThisBrowser(keep?: UserId): Promise<void> {
  const device = await readThisBrowser();
  if (device === undefined) {
    return;
  }
  await keepThisBrowser(device);
  await forgetPushSubscriptionsOfDevice(device, keep);
}

export {
  PUSH_DEVICE_COOKIE_NAME,
  PUSH_DEVICE_MAX_AGE_SECONDS,
  stopNotificationsToThisBrowser,
  thisBrowser,
};
