# Installed app and notifications

Project Buddy installs on a phone's Home Screen and can send push notifications to each device where the user turns them on. This page covers how that works, how to set it up, and how code sends a notification.

## Installed app

The web app manifest, `apps/web/src/app/manifest.ts`, makes the site installable. Next.js serves it at `/manifest.webmanifest` and links it from every page. It names the app "Project Buddy", opens the landing page in its own window (`display: standalone`), and lists the icons in `apps/web/public/icons/`.

- **Android:** Chrome offers **Install app** in its menu, or a prompt of its own.
- **iPhone and iPad:** Safari offers **Add to Home Screen** in the Share menu. The root layout's metadata gives Safari the Home Screen icon and title.

The colours a phone shows outside the pages, behind the splash screen and in the browser's bar, are the default theme's backgrounds, light and dark. They live in `apps/web/src/ui/web-app.ts` as `rgb()` values. `web-app.browser.test.tsx` checks that they match the theme as the browser paints it, so a change to Gravy Falls' backgrounds needs a change there too.

The proxy lets the manifest, the service worker and the icons through without a session, because browsers fetch them without the session cookie. It also lets the service worker's route, `/api/push-subscription`, through without one, because that route checks its own proof ([Renewed subscriptions](#renewed-subscriptions)).

## Service worker

The service worker, `apps/web/public/sw.js`, does three things:

- **Shows each push notification** with its title, text and the app's icon.
- **Opens the notification's page** when the user taps it, or focuses a window that already shows it. A page outside the site opens the landing page instead.
- **Renews the push subscription** when the browser changes it, so notifications keep arriving ([Renewed subscriptions](#renewed-subscriptions)).

It caches nothing. Every page, signed-in pages above all, comes from the server, so the app needs a connection, as the site does.

The browser registers the service worker only when the user turns notifications on, never before.

## Notifications on a device

Notifications are hidden until the site has its VAPID keys. Until then Settings has no **Notifications** section, and the Server Actions that turn notifications on, restore them and send a test refuse. Setting the keys and redeploying ([Set up the VAPID keys](#set-up-the-vapid-keys)) turns notifications on. The installed app needs no keys: the manifest, the icons and installing to the Home Screen work without them, and without them the service worker is never registered.

Once the keys are set, Settings has a **Notifications** section with one switch for the device in use. Each browser on each device has its own switch: turning notifications on for the phone leaves the laptop as it was.

1. The user switches notifications on. Only then does the browser ask for permission.
2. If she allows them, the browser subscribes to its push service with the site's VAPID public key, and the site saves the subscription to her account.
3. **Send a test notification** sends one to every device where she turned them on. Tapping it opens Settings.

The section says what to do instead of showing the switch when:

- **The browser can't receive push.** Safari on an iPhone or iPad offers push only to an installed app, so the user adds Project Buddy to her Home Screen first.
- **She blocked notifications.** Only the browser's site settings can undo that.

## Push subscriptions

The `push_subscriptions` table holds one row per subscription: its endpoint, which is the push service's URL for that browser, its two keys, its user, and its browser. `apps/web/src/push/push-subscriptions.ts` is the only module that reads or writes it.

The browser is a random id in the `push_device` cookie, which the site sets when the user turns notifications on or opens Settings with them on. The id names the browser, not the user, so it stays when someone signs out. A browser keeps a cookie for at most 400 days, so the site sets it again, with a fresh 400 days, each time it reads it: on turning notifications on, opening Settings, signing in and signing out. `apps/web/src/push/push-device-cookie.ts` reads and sets it. A row saved before the browser had an id has none, until Settings opens there.

- **Turned on again:** saving the same subscription again changes nothing.
- **Settings opens:** if the browser has a subscription, Settings saves it for the signed-in user only when no one has saved it, which restores one the server had forgotten. The switch shows on only when the subscription is that user's.
- **Turned off:** the browser unsubscribes and the site deletes the row.
- **Gone:** when a push service answers 404 or 410, the subscription has expired or been removed, so the site deletes the row.
- **Another user turns them on:** the endpoint belongs to the browser, so when another user turns notifications on in a browser, the subscription moves to them, and the first user's notifications stop going to it. Opening Settings alone never moves a subscription: in a browser that another user turned on, the switch shows off.
- **Renewed:** the service worker replaces the row's endpoint and keys, and keeps its user and browser ([Renewed subscriptions](#renewed-subscriptions)).
- **The user is deleted:** her subscriptions go with her.

### Sign-out

Signing out of a browser stops notifications to it, so the next person to use a shared laptop or a family tablet never sees the last user's.

- **Sign out:** the Server Action deletes every row with this browser's id before it deletes the session cookie. It needs no JavaScript, and it works when the session has lapsed. The session ends even if the delete fails, and the user then sees the error page, signed out.
- **The page's part:** when the page has JavaScript, the sign-out form also sends the browser's push endpoint, and the Server Action deletes that row too, if it belongs to the user signing out. This finds the subscription when the browser has lost its `push_device` cookie, such as after the user cleared it. The page also unsubscribes the browser from its push service. If either step fails, the server's delete by the browser's id still applies.
- **Signing in as someone else:** signing in deletes the rows of this browser's id that belong to any other user, so the last user's notifications stop there even if they never signed out.
- **Sign out everywhere:** the site deletes every row of the user's, on every device, as well as this browser's. A user signs out everywhere when she has lost a device or thinks someone else has used her account, so notifications shouldn't keep going to those devices. She can turn them on again on each device in Settings.

After signing back in, the user turns notifications on again in Settings. A session that expires without anyone signing out leaves the subscription in place, until someone signs out or signs in there.

### Renewed subscriptions

A browser sometimes changes its push subscription, when the old one expires or its push service rotates it. The service worker then gets a `pushsubscriptionchange` event, and:

1. Subscribes again with the site's VAPID public key: the old subscription's key, or else the key from `GET /api/push-subscription`.
2. Sends the old endpoint, the old keys and the new subscription to `POST /api/push-subscription`. A Server Action can't be called from a service worker, so this is a route handler.
3. Unsubscribes the new subscription if the route answers 404, because then no one's notifications should come to this browser.

The route replaces the old row with the new subscription, keeping its user and browser, only when the request proves a right to the old row:

- **The signed-in user owns it.** The service worker's request carries the session cookie while someone is signed in.
- **The request holds the old keys.** Only the browser and the site know a subscription's keys, so they prove the request comes from that browser. This is how a browser with no session, such as one whose session has lapsed, keeps its notifications.

A renewal never moves a subscription to another user. The route refuses a new endpoint that another user already has, and accepts only [accepted push services](#accepted-push-services), so sending still never follows a redirect. A body that isn't JSON is refused, so a plain form on another site can't post one.

Without an old subscription, the service worker has nothing to replace. Notifications then stay off on that browser until the user turns them on again in Settings. Without the site's VAPID keys, the route answers 404 to both requests.

## Accepted push services

A subscription comes from the browser, so a forged one could name any URL. The site saves only endpoints on the push services that browsers use, over `https:` on the default port, with no user name or password:

| Push service | Browsers | Hosts |
| --- | --- | --- |
| Firebase Cloud Messaging | Chrome, Android | `fcm.googleapis.com` |
| Mozilla autopush | Firefox | `*.push.services.mozilla.com` |
| Apple Push Notification service | Safari | `web.push.apple.com`, `*.push.apple.com` |
| Windows Push Notification Services | Edge | `*.notify.windows.com` |

Anything else is refused, such as an address in the server's own network. Sending never follows a redirect, so a push service can't send the request on to another address. To support another push service, add its host to `PUSH_SERVICE_HOSTS` or `PUSH_SERVICE_DOMAINS` in `push-subscriptions.ts`.

The server tests set `PUSH_ENDPOINTS=loopback`, which also accepts `http:` endpoints on `localhost` or `127.0.0.1`, so they can use a fake push service. It is a test setting: every Vercel deployment, previews included, refuses it.

## Send a notification from code

To notify a user on every device where they turned notifications on, call `sendPushNotification` from `apps/web/src/push/send-push-notification.ts`:

```ts
await sendPushNotification(userId, {
  title: "Vellum checked in",
  body: "How did the first step go?",
  url: "/chats/new",
});
```

- `url` is a path on the site, which a tap opens. A URL anywhere else opens the landing page.
- It returns how many push services took the notification: 0 when the user has no device turned on, or when the site has no VAPID keys.
- It never throws for a push service's failure. A refused or unreachable push service is logged as a `[push-error]` line, without the endpoint.
- A push service keeps the notification for a day for a device that is offline.

## Set up the VAPID keys

VAPID (Voluntary Application Server Identification) keys sign each notification, so push services know it comes from this site. To set them up:

1. Generate a key pair once:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to the two keys it prints, and `VAPID_SUBJECT` to a `mailto:` or `https:` address where push services can reach whoever runs the site, such as `mailto:me@example.com`.
3. Set all three in the Vercel quest for every environment, through its secret controls, and in `.env.local` for local work.
4. Redeploy, so the deployment gets the keys. Settings then shows the Notifications section.

Set all three or none: some without the others is an error. Keep the pair once it is in use. Every subscription is made with the public key, so a new pair stops notifications to every device until its user switches notifications off and on again in Settings.

To try notifications locally, run `next dev --experimental-https`, because browsers allow push only on HTTPS or `localhost`.
