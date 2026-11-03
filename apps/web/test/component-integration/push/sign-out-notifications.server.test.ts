// Signing out stops notifications to the browser, from the server's side:
// signOutAction deletes the subscriptions of the browser that its
// push_device cookie names, with no JavaScript in the page, so the next
// person to use a shared browser never sees the last user's notifications.
// Signing in as someone else stops the last user's too, and signing out
// everywhere stops them on every device. Part of
// "use_case_turn_on_notifications" in use-cases/notifications.md.

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import {
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/account/actions.ts";
import {
  restoreNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";
import { sendPushNotification } from "@/push/send-push-notification.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { lapsed, signIn } from "../test-database/session-test-kit.ts";
import {
  continueSignIn,
  emailedLoginToken,
  type SendEmail,
} from "../test-database/sign-in-link-test-kit.ts";
import {
  type FakePushService,
  startFakePushService,
} from "./fake-push-service-test-kit.ts";
import { inNewBrowser, setPushSettings } from "./push-settings-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

const NOTIFICATION = { title: "Hippy", body: "How did it go?", url: "/" };

let service: FakePushService;

beforeAll(async () => {
  service = await startFakePushService();
});

beforeEach(setPushSettings);

afterAll(async () => {
  await service.close();
});

describe("signing out stops notifications to the browser", () => {
  test("signing out, with no help from the page, stops hers there and nowhere else", async () => {
    const her = await testUser();
    const [sharedLaptop, phone] = [service.browser(), service.browser()];
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    await inNewBrowser();
    await turnOnNotificationsAction(sharedLaptop.subscription);

    await expectRedirect(() => signOutAction(new FormData()), SIGN_IN_PATH);

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
    expect(sharedLaptop.received()).toStrictEqual([]);
    expect(phone.notifications()).toStrictEqual([NOTIFICATION]);
  });

  test("signing out with a lapsed session stops them too", async () => {
    const her = await testUser();
    const sharedLaptop = service.browser();
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(sharedLaptop.subscription);
    await lapsed(her);

    await expectRedirect(() => signOutAction(new FormData()), SIGN_IN_PATH);

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
  });

  test("she can turn them on again after signing back in", async () => {
    const her = await testUser();
    const sharedLaptop = service.browser();
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(sharedLaptop.subscription);
    await expectRedirect(() => signOutAction(new FormData()), SIGN_IN_PATH);

    await signIn(her);

    expect(await turnOnNotificationsAction(sharedLaptop.subscription)).toBe(
      "saved",
    );
    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
  });

  test("another user signing in to the browser stops hers there", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const sharedLaptop = service.browser();
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(sharedLaptop.subscription);

    await continueSignIn(await emailedLoginToken(other, sent.sendEmail));

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
    expect(await restoreNotificationsAction(sharedLaptop.subscription)).toBe(
      "on",
    );
    expect(await sendPushNotification(other.id, NOTIFICATION)).toBe(1);
  });

  test("signing back in as herself keeps hers there", async () => {
    const her = await testUser();
    const phone = service.browser();
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);

    await continueSignIn(await emailedLoginToken(her, sent.sendEmail));

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
  });

  test("signing out everywhere stops hers on every device, and no one else's", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const [phone, laptop, theirs] = [
      service.browser(),
      service.browser(),
      service.browser(),
    ];
    await inNewBrowser();
    await signIn(other);
    await turnOnNotificationsAction(theirs.subscription);
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(phone.subscription);
    await inNewBrowser();
    await turnOnNotificationsAction(laptop.subscription);

    await expectRedirect(() => signOutEverywhereAction(), SIGN_IN_PATH);

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
    expect(await sendPushNotification(other.id, NOTIFICATION)).toBe(1);
  });
});
