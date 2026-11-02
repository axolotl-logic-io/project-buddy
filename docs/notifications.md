# Installed app and notifications

Project Buddy installs on a phone's Home Screen and can send push notifications to each device where the user turns them on. This page covers how that works, how to set it up, and how code sends a notification.

## Installed app

The web app manifest, `apps/web/src/app/manifest.ts`, makes the site installable. Next.js serves it at `/manifest.webmanifest` and links it from every page. It names the app "Project Buddy", opens the landing page in its own window (`display: standalone`), and lists the icons in `apps/web/public/icons/`.

- **Android:** Chrome offers **Install app** in its menu, or a prompt of its own.
- **iPhone and iPad:** Safari offers **Add to Home Screen** in the Share menu. The root layout's metadata gives Safari the Home Screen icon and title.

The colours a phone shows outside the pages, behind the splash screen and in the browser's bar, are the default theme's backgrounds, light and dark. They live in `apps/web/src/ui/web-app.ts` as `rgb()` values. `web-app.browser.test.tsx` checks that they match the theme as the browser paints it, so a change to Gravy Falls' backgrounds needs a change there too.

The proxy lets the manifest, the service worker and the icons through without a session, because browsers fetch them without the session cookie.

## Service worker

The service worker, `apps/web/public/sw.js`, does two things:

- **Shows each push notification** with its title, text and the app's icon.
- **Opens the notification's page** when the user taps it, or focuses a window that already shows it. A page outside the site opens the landing page instead.

It caches nothing. Every page, signed-in pages above all, comes from the server, so the app needs a connection, as the site does.

The browser registers the service worker only when the user turns notifications on, never before.

## Notifications on a device

Settings has a **Notifications** section with one switch for the device in use. Each browser on each device has its own switch: turning notifications on for the phone leaves the laptop as it was.

1. The user switches notifications on. Only then does the browser ask for permission.
2. If she allows them, the browser subscribes to its push service with the site's VAPID public key, and the site saves the subscription to her account.
3. **Send a test notification** sends one to every device where she turned them on. Tapping it opens Settings.

The section says what to do instead of showing the switch when:

- **The browser can't receive push.** Safari on an iPhone or iPad offers push only to an installed app, so the user adds Project Buddy to her Home Screen first.
- **She blocked notifications.** Only the browser's site settings can undo that.
- **The site has no VAPID keys.** Nothing can be sent until they are set.

## Push subscriptions

The `push_subscriptions` table holds one row per subscription: its endpoint, which is the push service's URL for that browser, its two keys, and its user. `apps/web/src/push/push-subscriptions.ts` is the only module that reads or writes it.

- **Turned on again:** saving the same subscription again changes nothing. Settings saves the device's subscription each time it opens, which restores one the server had forgotten.
- **Turned off:** the browser unsubscribes and the site deletes the row.
- **Gone:** when a push service answers 404 or 410, the subscription has expired or been removed, so the site deletes the row.
- **Another user signs in:** the endpoint belongs to the browser, so when another user turns notifications on in a browser, the subscription moves to them. The first user's notifications stop going to a browser they no longer use.
- **The user is deleted:** her subscriptions go with her.

The site sends notifications only to `https:` push services that are not on the server's own machine. The server tests set `PUSH_ENDPOINTS=loopback` so that they can use a fake push service on `localhost`; production refuses that setting.

## Send a notification from code

To notify a user on every device where they turned notifications on, call `sendPushNotification` from `apps/web/src/push/send-push-notification.ts`:

```ts
await sendPushNotification(userId, {
  title: "Hippy checked in",
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
3. Set all three in the Vercel project for every environment, through its secret controls, and in `.env.local` for local work.
4. Redeploy, so the deployment gets the keys.

Set all three or none: some without the others is an error. Keep the pair once it is in use. Every subscription is made with the public key, so a new pair stops notifications to every device until its user switches notifications off and on again in Settings.

To try notifications locally, run `next dev --experimental-https`, because browsers allow push only on HTTPS or `localhost`.
