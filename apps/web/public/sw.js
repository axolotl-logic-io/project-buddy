// Project Buddy's service worker. It only shows push notifications, opens
// their page when tapped, and keeps the browser's push subscription saved
// when the browser renews it; it caches nothing, so every page, signed-in
// pages above all, always comes from the server. The server sends each
// notification as JSON: { title, body, url }, where url is a path on this
// site (src/push/send-push-notification.ts).
const ICON = "/icons/icon-192.png";
const HOME = "/";
// PUSH_SUBSCRIPTION_PATH in src/routes.ts.
const PUSH_SUBSCRIPTION_PATH = "/api/push-subscription";
const NOT_FOUND = 404;

// The notification a push carries, or a plain one when it carries nothing
// readable.
function readPush(data) {
  try {
    const { title, body, url } = data.json();
    return { title: String(title), body: String(body), url: String(url) };
  } catch {
    return { title: "Project Buddy", body: "", url: HOME };
  }
}

// url as an address on this site, or the home page when it points elsewhere.
function sitePage(url) {
  const page = new URL(url, globalThis.location.origin);
  if (page.origin !== globalThis.location.origin) {
    return new URL(HOME, globalThis.location.origin);
  }
  return page;
}

// Focuses a window that already shows page, or opens one.
async function openPage(page) {
  const windows = await globalThis.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const showing = windows.find((client) => client.url === page.href);
  if (showing !== undefined) {
    await showing.focus();
    return;
  }
  await globalThis.clients.openWindow(page.href);
}

globalThis.addEventListener("push", (event) => {
  if (event.data === null) {
    return;
  }
  const { title, body, url } = readPush(event.data);
  event.waitUntil(
    globalThis.registration.showNotification(title, {
      body,
      icon: ICON,
      data: { url },
    }),
  );
});

globalThis.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? HOME;
  event.waitUntil(openPage(sitePage(url)));
});

// The site's VAPID public key: the old subscription's, or else the site's
// own, or undefined when the site has none.
async function publicKey(oldSubscription) {
  const key = oldSubscription.options?.applicationServerKey;
  if (key !== null && key !== undefined) {
    return key;
  }
  const response = await globalThis.fetch(PUSH_SUBSCRIPTION_PATH, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    return;
  }
  const { publicKey: siteKey } = await response.json();
  return siteKey;
}

// Subscribes again with the same key and has the site replace the old
// subscription with the new one, for the same user. The old keys prove the
// browser held the old subscription, so this works signed out too. When
// the site replaces nothing, because the old subscription was turned off
// or its user signed out of this browser, nobody's notifications should
// come here, so the new subscription is dropped. Without an old
// subscription there is nothing to replace: notifications stay off until
// someone turns them on in Settings.
async function renewSubscription(oldSubscription) {
  if (oldSubscription === null || oldSubscription === undefined) {
    return;
  }
  const key = await publicKey(oldSubscription);
  if (key === undefined) {
    return;
  }
  const subscription = await globalThis.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const response = await globalThis.fetch(PUSH_SUBSCRIPTION_PATH, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      oldEndpoint: oldSubscription.endpoint,
      oldKeys: oldSubscription.toJSON().keys,
      subscription: subscription.toJSON(),
    }),
  });
  if (response.status === NOT_FOUND) {
    await subscription.unsubscribe();
  }
}

globalThis.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(renewSubscription(event.oldSubscription));
});
