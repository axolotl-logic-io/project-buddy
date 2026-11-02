// "use_case_turn_on_notifications" in use-cases/notifications.md, from the
// server's side: the Settings switch's Server Actions save and forget each
// device's push subscription for the signed-in user alone, and a test
// notification reaches every device where she turned them on, encrypted for
// that browser and signed with the site's VAPID keys, through a fake push
// service that the site reaches as it reaches a real one. That the switch
// asks for the browser's permission only when tapped is
// notification-switch.browser.test.tsx's to check.

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
import {
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
