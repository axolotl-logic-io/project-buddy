// Project Buddy's service worker. It only shows push notifications and
// opens their page when tapped; it caches nothing, so every page, signed-in
// pages above all, always comes from the server. The server sends each
// notification as JSON: { title, body, url }, where url is a path on this
// site (src/push/send-push-notification.ts).
const ICON = "/icons/icon-192.png";
const HOME = "/";

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
