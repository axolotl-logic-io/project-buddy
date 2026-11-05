// A browser renewing its push subscription, from the server's side: the
// service worker (public/sw.js), run as a browser runs it, subscribes again
// with the site's key and has the push subscription route replace the old
// subscription with the new one, for the same user, so her notifications
// follow the browser. Only the old subscription's owner, or a request with
// its keys, may replace it, and never with another user's endpoint. Part of
// "use_case_turn_on_notifications" in use-cases/notifications.md.

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { signOutAction } from "@/app/(workspace)/account/actions.ts";
import { POST } from "@/app/api/push-subscription/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  restoreNotificationsAction,
  turnOffNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";
import { sendPushNotification } from "@/push/send-push-notification.ts";
import { PUSH_SUBSCRIPTION_PATH, SIGN_IN_PATH } from "@/routes.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import {
  requestWithSession,
  signIn,
  signOut,
} from "../test-database/session-test-kit.ts";
import {
  type FakeBrowser,
  type FakePushService,
  startFakePushService,
} from "./fake-push-service-test-kit.ts";
import {
  inNewBrowser,
  setPushSettings,
  unsetVapidKeys,
  VAPID_KEYS,
} from "./push-settings-test-kit.ts";
import {
  pushSubscriptionOf,
  startServiceWorker,
} from "./service-worker-test-kit.ts";

const NOTIFICATION = { title: "Vellum", body: "How did it go?", url: "/" };
const SITE_KEY = Buffer.from(VAPID_KEYS.publicKey, "base64url");

let service: FakePushService;

beforeAll(async () => {
  service = await startFakePushService();
});

beforeEach(setPushSettings);

afterAll(async () => {
  await service.close();
});

// What the browser has for old, made with the site's key.
function siteSubscription(
  old: FakeBrowser,
): ReturnType<typeof pushSubscriptionOf> {
  return pushSubscriptionOf(old, Uint8Array.from(SITE_KEY).buffer);
}

// The service worker's request to replace old with renewed, as it sends
// it, with old's keys, or others, or none (null).
function renewal(
  old: FakeBrowser,
  renewed: FakeBrowser,
  keys: FakeBrowser["subscription"]["keys"] | null = old.subscription.keys,
): Request {
  const oldKeys = keys ?? undefined;
  return requestWithSession(`http://localhost${PUSH_SUBSCRIPTION_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      oldEndpoint: old.subscription.endpoint,
      oldKeys,
      subscription: renewed.subscription,
    }),
  });
}

describe("a renewed push subscription keeps notifications coming", () => {
  test("the service worker subscribes again with the site's key, and her notifications follow", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    const worker = await startServiceWorker(renewed);

    await worker.changeSubscription(siteSubscription(old));

    expect(worker.subscribedWith()).toStrictEqual([SITE_KEY]);
    expect(worker.unsubscribed()).toBe(false);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(renewed.notifications()).toStrictEqual([NOTIFICATION]);
    expect(old.received()).toStrictEqual([]);
  });

  test("signed out, the old subscription's keys are proof enough, and it stays hers", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    signOut();
    const worker = await startServiceWorker(renewed);

    await worker.changeSubscription(siteSubscription(old));

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(renewed.notifications()).toStrictEqual([NOTIFICATION]);
  });

  test("when the old subscription doesn't say its key, the service worker asks the site", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    const worker = await startServiceWorker(renewed);

    await worker.changeSubscription(pushSubscriptionOf(old, null));

    expect(worker.subscribedWith()).toStrictEqual([SITE_KEY]);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(renewed.notifications()).toHaveLength(1);
  });

  test("signing out after a renewal still stops them in that browser", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    await (await startServiceWorker(renewed)).changeSubscription(
      siteSubscription(old),
    );

    await expectRedirect(() => signOutAction(new FormData()), SIGN_IN_PATH);

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
  });

  test("a subscription whose user signed out of the browser is dropped, not renewed", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    await expectRedirect(() => signOutAction(new FormData()), SIGN_IN_PATH);
    const worker = await startServiceWorker(renewed);

    await worker.changeSubscription(siteSubscription(old));

    expect(worker.unsubscribed()).toBe(true);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
  });

  test("a renewed subscription Settings already restored is not saved twice", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    await restoreNotificationsAction(renewed.subscription);

    expect((await POST(renewal(old, renewed))).status).toBe(
      HTTP_STATUS.noContent,
    );

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(renewed.notifications()).toHaveLength(1);
    expect(old.received()).toStrictEqual([]);
  });

  test("without the VAPID keys, the service worker subscribes to nothing and the route refuses", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    unsetVapidKeys();
    const worker = await startServiceWorker(renewed);

    await worker.changeSubscription(pushSubscriptionOf(old, null));
    const response = await POST(renewal(old, renewed));

    expect(worker.subscribedWith()).toStrictEqual([]);
    expect(response.status).toBe(HTTP_STATUS.notFound);
  });
});

describe("a renewal never takes another user's subscription", () => {
  test("another signed-in user can't move her subscription without its keys", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const [hers, theirs] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(hers.subscription);
    await signIn(other);

    const response = await POST(renewal(hers, theirs, null));

    expect(response.status).toBe(HTTP_STATUS.notFound);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(hers.notifications()).toHaveLength(1);
    expect(theirs.received()).toStrictEqual([]);
    expect(await sendPushNotification(other.id, NOTIFICATION)).toBe(0);
  });

  test("keys that aren't the old subscription's prove nothing", async () => {
    const her = await testUser();
    const [hers, forger] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(hers.subscription);
    signOut();

    const response = await POST(
      renewal(hers, forger, forger.subscription.keys),
    );

    expect(response.status).toBe(HTTP_STATUS.notFound);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(forger.received()).toStrictEqual([]);
  });

  test("a renewal onto her endpoint leaves it hers", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const [hers, theirs] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(hers.subscription);
    await signIn(other);
    await turnOnNotificationsAction(theirs.subscription);

    const response = await POST(renewal(theirs, hers));

    expect(response.status).toBe(HTTP_STATUS.notFound);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(await sendPushNotification(other.id, NOTIFICATION)).toBe(1);
    expect(hers.notifications()).toHaveLength(1);
    expect(theirs.notifications()).toHaveLength(1);
  });

  test("a subscription she turned off can't be renewed", async () => {
    const her = await testUser();
    const [old, renewed] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    await turnOffNotificationsAction(old.subscription.endpoint);

    const response = await POST(renewal(old, renewed));

    expect(response.status).toBe(HTTP_STATUS.notFound);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
  });

  test("a renewed endpoint that isn't a push service's, or a body that isn't JSON, is refused", async () => {
    const her = await testUser();
    const old = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(old.subscription);
    const forged = {
      endpoint: "https://10.0.0.1/push/1",
      keys: old.subscription.keys,
    };

    const responses = await Promise.all([
      POST(
        requestWithSession(`http://localhost${PUSH_SUBSCRIPTION_PATH}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: old.subscription.endpoint,
            oldKeys: old.subscription.keys,
            subscription: forged,
          }),
        }),
      ),
      POST(
        requestWithSession(`http://localhost${PUSH_SUBSCRIPTION_PATH}`, {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: JSON.stringify({
            oldEndpoint: old.subscription.endpoint,
            oldKeys: old.subscription.keys,
            subscription: service.browser().subscription,
          }),
        }),
      ),
    ]);

    expect(responses.map(({ status }) => status)).toStrictEqual([
      HTTP_STATUS.badRequest,
      HTTP_STATUS.badRequest,
    ]);
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(old.notifications()).toHaveLength(1);
  });
});
