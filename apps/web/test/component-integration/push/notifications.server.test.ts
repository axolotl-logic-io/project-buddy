// "use_case_turn_on_notifications" in use-cases/notifications.md, from the
// server's side: the Settings switch's Server Actions save and forget each
// device's push subscription for the signed-in user alone, and a test
// notification reaches every device where she turned them on, encrypted for
// that browser and signed with the site's VAPID keys, through a fake push
// service that the site reaches as it reaches a real one. That the switch
// asks for the browser's permission only when tapped is
// notification-switch.browser.test.tsx's to check.

import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { generateVAPIDKeys } from "web-push";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import {
  restoreNotificationsAction,
  sendTestNotificationAction,
  turnOffNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";
import { sendPushNotification } from "@/push/send-push-notification.ts";
import { HOME_PATH, SETTINGS_PATH } from "@/routes.ts";
import { NOTIFICATIONS_COPY } from "@/ui/copy/settings.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import {
  type FakePushService,
  type ShownNotification,
  startFakePushService,
} from "./fake-push-service-test-kit.ts";

const VAPID_KEYS: { readonly publicKey: string; readonly privateKey: string } =
  generateVAPIDKeys();
const VAPID_SUBJECT = "mailto:push@example.test";

const TEST_NOTIFICATION: ShownNotification = {
  title: NOTIFICATIONS_COPY.testTitle,
  body: NOTIFICATIONS_COPY.testBody,
  url: SETTINGS_PATH,
};

// Endpoints a forged subscription might name to make the server post into
// its own network, or to a host dressed up as a push service.
const FORGED_ENDPOINTS: readonly string[] = [
  "https://10.0.0.1/push/1",
  "https://[::1]/push/1",
  "https://127.0.0.2/push/1",
  "https://0.0.0.0/push/1",
  "https://localhost./push/1",
  "https://internal-admin/push/1",
  "https://fcm.googleapis.com.attacker.example/fcm/send/1",
  "https://attacker.example/fcm.googleapis.com/1",
  "https://fcm.googleapis.com:8443/fcm/send/1",
  "https://someone@fcm.googleapis.com/fcm/send/1",
  "http://fcm.googleapis.com/fcm/send/1",
];

// Endpoints of the push services browsers really use.
const PUSH_SERVICE_ENDPOINTS: readonly string[] = [
  "https://fcm.googleapis.com/fcm/send/abc",
  "https://updates.push.services.mozilla.com/wpush/v2/abc",
  "https://web.push.apple.com/QAbc",
  "https://wns2-par02p.notify.windows.com/w/?token=abc",
];

let service: FakePushService;

beforeAll(async () => {
  service = await startFakePushService();
});

beforeEach(() => {
  vi.stubEnv("VAPID_PUBLIC_KEY", VAPID_KEYS.publicKey);
  vi.stubEnv("VAPID_PRIVATE_KEY", VAPID_KEYS.privateKey);
  vi.stubEnv("VAPID_SUBJECT", VAPID_SUBJECT);
  vi.stubEnv("PUSH_ENDPOINTS", "loopback");
  return (): void => {
    vi.unstubAllEnvs();
  };
});

afterAll(async () => {
  await service.close();
});

describe("use_case_turn_on_notifications", () => {
  test("a test notification reaches each device where she turned them on, signed by the site", async () => {
    const her = await testUser();
    const [phone, laptop] = [service.browser(), service.browser()];
    await signIn(her);
    expect(await turnOnNotificationsAction(phone.subscription)).toBe("saved");
    expect(await turnOnNotificationsAction(laptop.subscription)).toBe("saved");

    expect(await sendTestNotificationAction()).toBe("sent");

    expect(phone.notifications()).toStrictEqual([TEST_NOTIFICATION]);
    expect(laptop.notifications()).toStrictEqual([TEST_NOTIFICATION]);
    expect(
      phone
        .received()
        .map(
          ({ headers: { "content-encoding": encoding, authorization } }) => ({
            encoding,
            signedBySite: String(authorization).includes(
              `k=${VAPID_KEYS.publicKey}`,
            ),
          }),
        ),
    ).toStrictEqual([{ encoding: "aes128gcm", signedBySite: true }]);
  });

  test("turning them on again on the same device sends one notification, not two", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    await turnOnNotificationsAction(phone.subscription);

    await sendTestNotificationAction();

    expect(phone.notifications()).toHaveLength(1);
  });

  test("turning them off on one device stops them there and nowhere else", async () => {
    const her = await testUser();
    const [phone, laptop] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    await turnOnNotificationsAction(laptop.subscription);

    await turnOffNotificationsAction(phone.subscription.endpoint);
    await sendTestNotificationAction();

    expect(phone.notifications()).toStrictEqual([]);
    expect(laptop.notifications()).toStrictEqual([TEST_NOTIFICATION]);
  });

  test("with no device turned on, nothing is sent", async () => {
    await signIn(await testUser());

    expect(await sendTestNotificationAction()).toBe("not-sent");
  });

  test("a device the push service says is gone is forgotten", async () => {
    const her = await testUser();
    const [phone, laptop] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    await turnOnNotificationsAction(laptop.subscription);
    phone.unsubscribeAtService();

    expect(await sendTestNotificationAction()).toBe("sent");
    expect(await sendTestNotificationAction()).toBe("sent");

    expect(phone.received()).toHaveLength(1);
    expect(phone.notifications()).toStrictEqual([]);
    expect(laptop.notifications()).toHaveLength(2);
  });

  test("a subscription that isn't a push service's is refused", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);
    const plainHttp = {
      ...phone.subscription,
      endpoint: "http://push.example.test/send/1",
    };

    expect(await turnOnNotificationsAction(plainHttp)).toBe("refused");
    expect(await turnOnNotificationsAction({ endpoint: "nope" })).toBe(
      "refused",
    );
    vi.stubEnv("PUSH_ENDPOINTS", "public");
    expect(await turnOnNotificationsAction(phone.subscription)).toBe("refused");
  });

  test("only the known push services are accepted", async () => {
    const her = await testUser();
    const { keys } = service.browser().subscription;
    await signIn(her);
    vi.stubEnv("PUSH_ENDPOINTS", "public");

    const forged = await Promise.all(
      FORGED_ENDPOINTS.map((endpoint) =>
        turnOnNotificationsAction({ endpoint, keys }),
      ),
    );
    const real = await Promise.all(
      PUSH_SERVICE_ENDPOINTS.map((endpoint) =>
        turnOnNotificationsAction({ endpoint, keys }),
      ),
    );

    expect(forged).toStrictEqual(FORGED_ENDPOINTS.map(() => "refused"));
    expect(real).toStrictEqual(PUSH_SERVICE_ENDPOINTS.map(() => "saved"));
  });

  test("the tests' loopback push service is refused on any Vercel deployment", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);
    vi.stubEnv("VERCEL_ENV", "preview");

    await expect(turnOnNotificationsAction(phone.subscription)).rejects.toThrow(
      "PUSH_ENDPOINTS",
    );
  });

  test("a push service's redirect is not followed", async () => {
    const her = await testUser();
    const [phone, elsewhere] = [service.browser(), service.browser()];
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    phone.redirectAtServiceTo(elsewhere.subscription.endpoint);

    expect(await sendTestNotificationAction()).toBe("not-sent");

    expect(phone.received()).toHaveLength(1);
    expect(elsewhere.received()).toStrictEqual([]);
  });

  test("a notification opens only a page of the site", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);

    expect(
      await sendPushNotification(her.id, {
        title: "Away",
        body: "Somewhere else",
        url: "https://example.test/elsewhere",
      }),
    ).toBe(1);

    expect(phone.notifications()).toStrictEqual([
      { title: "Away", body: "Somewhere else", url: HOME_PATH },
    ]);
  });

  test("without VAPID keys the site sends nothing", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    vi.stubEnv("VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("VAPID_SUBJECT", "");

    expect(await sendTestNotificationAction()).toBe("not-sent");
    expect(phone.received()).toHaveLength(0);
  });
});

describe("notifications stay hidden until the VAPID keys are set", () => {
  test("with the keys set, Settings shows notifications and a device can turn them on", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);

    const html = renderToStaticMarkup(SettingsPage());

    expect(html).toContain(NOTIFICATIONS_COPY.heading);
    expect(await turnOnNotificationsAction(phone.subscription)).toBe("saved");
    expect(await restoreNotificationsAction(phone.subscription)).toBe("on");
    expect(await sendTestNotificationAction()).toBe("sent");
  });

  test("without the keys, Settings hides notifications, and turning them on, restoring them and testing them are refused", async () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("VAPID_SUBJECT", "");
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);

    const html = renderToStaticMarkup(SettingsPage());

    expect(html).not.toContain(NOTIFICATIONS_COPY.heading);
    expect(html).not.toContain(NOTIFICATIONS_COPY.hint);
    expect(await turnOnNotificationsAction(phone.subscription)).toBe("refused");
    expect(await restoreNotificationsAction(phone.subscription)).toBe("off");
    expect(await sendTestNotificationAction()).toBe("not-sent");
    expect(phone.received()).toHaveLength(0);
  });
});

describe("notifications are private", () => {
  test("her devices get only her notifications, and only she can turn them off", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const phone = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);

    await signIn(other);
    await turnOffNotificationsAction(phone.subscription.endpoint);
    expect(await sendTestNotificationAction()).toBe("not-sent");

    await signIn(her);
    expect(await sendTestNotificationAction()).toBe("sent");
    expect(phone.notifications()).toHaveLength(1);
  });

  test("opening Settings in a browser another user turned on doesn't take it over", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const sharedLaptop = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(sharedLaptop.subscription);

    await signIn(other);

    expect(await restoreNotificationsAction(sharedLaptop.subscription)).toBe(
      "off",
    );
    expect(await sendPushNotification(other.id, TEST_NOTIFICATION)).toBe(0);
    expect(await sendPushNotification(her.id, TEST_NOTIFICATION)).toBe(1);
  });

  test("opening Settings restores her own subscription the server forgot", async () => {
    const her = await testUser();
    const phone = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    await turnOffNotificationsAction(phone.subscription.endpoint);

    expect(await restoreNotificationsAction(phone.subscription)).toBe("on");
    expect(await restoreNotificationsAction(phone.subscription)).toBe("on");
    expect(await sendTestNotificationAction()).toBe("sent");
    expect(phone.notifications()).toHaveLength(1);
  });

  test("a browser where another user turns them on is theirs from then on", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const sharedLaptop = service.browser();
    await signIn(her);
    await turnOnNotificationsAction(sharedLaptop.subscription);

    await signIn(other);
    await turnOnNotificationsAction(sharedLaptop.subscription);

    expect(await sendPushNotification(her.id, TEST_NOTIFICATION)).toBe(0);
    expect(await sendPushNotification(other.id, TEST_NOTIFICATION)).toBe(1);
  });
});
