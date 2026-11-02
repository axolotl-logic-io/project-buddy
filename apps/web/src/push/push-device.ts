// Notifications on this device, as the Settings page's switch sees them:
// whether this browser can show them, whether she has blocked them, and
// whether she turned them on here. The only browser module that knows the
// service worker (public/sw.js), the Notifications permission and the push
// subscription. Turning notifications on asks for the permission, so only a
// tap on the switch should call it.
import {
  turnOffNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";

// unsupported: this browser can't receive push notifications, such as Safari
// on an iPhone before the site is added to the Home Screen. blocked: she
// denied the permission, which only her browser's settings can undo. off
// and on: the switch's two positions.
type NotificationsState = "unsupported" | "blocked" | "off" | "on";

const SERVICE_WORKER_URL = "/sw.js";
const SERVICE_WORKER_SCOPE = "/";

const BASE64URL_PLUS = /-/gu;
const BASE64URL_SLASH = /_/gu;
const BASE64_BLOCK = 4;

function canReceivePush(): boolean {
  return (
    "serviceWorker" in navigator &&
    typeof globalThis.PushManager === "function" &&
    typeof globalThis.Notification === "function"
  );
}

// The site's VAPID public key, URL-safe base64 as the server hands it out,
// as the bytes pushManager.subscribe takes.
function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat(
    (BASE64_BLOCK - (publicKey.length % BASE64_BLOCK)) % BASE64_BLOCK,
  );
  const binary = atob(
    `${publicKey}${padding}`
      .replace(BASE64URL_PLUS, "+")
      .replace(BASE64URL_SLASH, "/"),
  );
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// This browser's push subscription for the site, if it has one.
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration =
    await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
  if (registration === undefined) {
    return null;
  }
  return registration.pushManager.getSubscription();
}

// Where notifications stand on this device. When they are on, it saves the
// subscription to her account again, which restores it if the server had
// forgotten it, such as after she signed in here as herself again. It never
// asks for the permission.
async function readNotificationsState(): Promise<NotificationsState> {
  if (!canReceivePush()) {
    return "unsupported";
  }
  if (Notification.permission === "denied") {
    return "blocked";
  }
  const subscription = await currentSubscription();
  if (subscription === null || Notification.permission !== "granted") {
    return "off";
  }
  if ((await turnOnNotificationsAction(subscription.toJSON())) !== "saved") {
    return "off";
  }
  return "on";
}

// Asks for the permission, then subscribes this browser to push with the
// site's public key and saves the subscription to her account. Any older
// subscription, perhaps made with an older key, is replaced. Throws when the
// browser or the server fails.
async function turnOnNotifications(
  publicKey: string,
): Promise<NotificationsState> {
  if (!canReceivePush()) {
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    return "blocked";
  }
  if (permission !== "granted") {
    return "off";
  }
  await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: SERVICE_WORKER_SCOPE,
    updateViaCache: "none",
  });
  const registration = await navigator.serviceWorker.ready;
  const older = await registration.pushManager.getSubscription();
  if (older !== null) {
    await older.unsubscribe();
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(publicKey),
  });
  if ((await turnOnNotificationsAction(subscription.toJSON())) !== "saved") {
    await subscription.unsubscribe();
    throw new Error("The site refused this browser's push subscription.");
  }
  return "on";
}

// Unsubscribes this browser and removes its subscription from her account,
// which leaves notifications off.
async function turnOffNotifications(): Promise<void> {
  const subscription = await currentSubscription();
  if (subscription !== null) {
    const { endpoint } = subscription;
    await subscription.unsubscribe();
    await turnOffNotificationsAction(endpoint);
  }
}

export type { NotificationsState };
export { readNotificationsState, turnOffNotifications, turnOnNotifications };
