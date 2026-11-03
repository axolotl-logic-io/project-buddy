// Signing out stops notifications to the browser, from the server's side:
// signOutAction deletes the subscriptions of the browser that its
// push_device cookie names, with no JavaScript in the page, so the next
// person to use a shared browser never sees the last user's notifications.
// Signing in as someone else stops the last user's too, and signing out
// everywhere stops them on every device. The page also sends the
// browser's push endpoint, which stops hers when the cookie is gone, and
// the session ends even when stopping them fails. Part of
// "use_case_turn_on_notifications" in use-cases/notifications.md.

import { cookies } from "next/headers";
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
import { PUSH_ENDPOINT_FIELD } from "@/app/(workspace)/account/sign-out-form.ts";
import { currentUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import {
  restoreNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";
import {
  PUSH_DEVICE_COOKIE_NAME,
  PUSH_DEVICE_MAX_AGE_SECONDS,
} from "@/push/push-device-cookie.ts";
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
import {
  inBrowser,
  inNewBrowser,
  setPushSettings,
} from "./push-settings-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

// When failing.next is set, the next delete of a browser's subscriptions
// fails, as a database blip would.
const failing = vi.hoisted(() => ({ next: false }));
vi.mock("@/push/push-subscriptions.ts", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("@/push/push-subscriptions.ts")>();
  return {
    ...real,
    forgetPushSubscriptionsOfDevice: (
      ...args: Parameters<typeof real.forgetPushSubscriptionsOfDevice>
    ): Promise<void> => {
      if (failing.next) {
        failing.next = false;
        return Promise.reject(new Error("The database blinked"));
      }
      return real.forgetPushSubscriptionsOfDevice(...args);
    },
  };
});

const NOTIFICATION = { title: "Hippy", body: "How did it go?", url: "/" };

let service: FakePushService;

// The sign-out form as the page sends it, with this browser's push
// endpoint once the page has read it.
function signOutForm(endpoint?: string): FormData {
  const form = new FormData();
  form.set(PUSH_ENDPOINT_FIELD, endpoint ?? "");
  return form;
}

// This browser's push_device cookie as the site last set it, then set
// again by the test, with no lifetime, so the next check sees whether the
// site sets it again.
async function deviceCookieOnce(device: string): Promise<unknown> {
  const cookie = (await cookies()).get(PUSH_DEVICE_COOKIE_NAME);
  await inBrowser(device);
  return cookie;
}

// Drops this browser's push_device cookie, as a browser does after 400
// days unused, or when its user clears it.
async function dropDeviceCookie(): Promise<void> {
  (await cookies()).delete(PUSH_DEVICE_COOKIE_NAME);
}

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

  test("without the browser's cookie, the endpoint the page sends stops hers", async () => {
    const her = await testUser();
    const sharedLaptop = service.browser();
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(sharedLaptop.subscription);
    await dropDeviceCookie();

    await expectRedirect(
      () => signOutAction(signOutForm(sharedLaptop.subscription.endpoint)),
      SIGN_IN_PATH,
    );

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(0);
  });

  test("an endpoint the form sends can't stop another user's", async () => {
    const [her, other] = await Promise.all([testUser(), testUser()]);
    const hers = service.browser();
    await inNewBrowser();
    await signIn(her);
    await turnOnNotificationsAction(hers.subscription);
    await inNewBrowser();
    await signIn(other);

    await expectRedirect(
      () => signOutAction(signOutForm(hers.subscription.endpoint)),
      SIGN_IN_PATH,
    );

    expect(await sendPushNotification(her.id, NOTIFICATION)).toBe(1);
  });

  test("turning them on, signing in and signing out keep the browser's cookie for another 400 days", async () => {
    const her = await testUser();
    const phone = service.browser();
    const device = await inNewBrowser();
    await signIn(her);
    const forDays = {
      name: PUSH_DEVICE_COOKIE_NAME,
      value: device,
      maxAge: PUSH_DEVICE_MAX_AGE_SECONDS,
    };

    await turnOnNotificationsAction(phone.subscription);
    const afterTurningOn = await deviceCookieOnce(device);
    await continueSignIn(await emailedLoginToken(her, sent.sendEmail));
    const afterSigningIn = await deviceCookieOnce(device);
    await expectRedirect(() => signOutAction(signOutForm()), SIGN_IN_PATH);
    const afterSigningOut = await deviceCookieOnce(device);

    expect([afterTurningOn, afterSigningIn, afterSigningOut]).toStrictEqual([
      forDays,
      forDays,
      forDays,
    ]);
  });

  test("when stopping notifications fails, signing out still ends the session", async () => {
    const her = await testUser();
    await inNewBrowser();
    await signIn(her);
    failing.next = true;

    await expect(signOutAction(signOutForm())).rejects.toThrow(
      "The database blinked",
    );

    expect((await cookies()).get(SESSION_COOKIE_NAME)).toBeUndefined();
    await signIn(her);
    expect(await currentUser()).toBeDefined();
  });

  test("when stopping notifications fails, signing out everywhere still ends every session", async () => {
    const her = await testUser();
    await inNewBrowser();
    await signIn(her);
    failing.next = true;

    await expect(signOutEverywhereAction()).rejects.toThrow(
      "The database blinked",
    );

    expect((await cookies()).get(SESSION_COOKIE_NAME)).toBeUndefined();
    await signIn(her);
    expect(await currentUser()).toBeUndefined();
  });
});
