// Signing out unsubscribes this browser from push, in Chromium and WebKit,
// so no one's notifications come to it after. The Server Action deletes
// the subscription on the server whatever the page manages, which
// test/component-integration/push/sign-out-notifications.server.test.ts
// covers; here the browser's push subscription is a fake, since a headless
// browser has no push service.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/account/actions.ts";
import { SignOutButtons } from "@/app/(workspace)/account/sign-out-buttons.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const actions = vi.hoisted(() => ({
  signOutAction: vi.fn<typeof signOutAction>(),
  signOutEverywhereAction: vi.fn<typeof signOutEverywhereAction>(),
}));
vi.mock("@/app/(workspace)/account/actions.ts", () => actions);
// Signing out turns notifications off without them.
vi.mock("@/push/notification-actions.ts", () => ({
  restoreNotificationsAction: vi.fn(),
  turnOffNotificationsAction: vi.fn(),
  turnOnNotificationsAction: vi.fn(),
}));

const unsubscribe = vi.fn<() => Promise<boolean>>();

// Resolves once she has signed out: the Server Action was called. It never
// finishes, as the real one ends in a redirect.
function signingOut(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  actions.signOutAction.mockImplementation((): Promise<never> => {
    resolve();
    return new Promise<never>(() => undefined);
  });
  return promise;
}

// Resolves once the page has unsubscribed this browser, which answers
// with outcome.
function unsubscribing(outcome: () => Promise<boolean>): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  unsubscribe.mockImplementation((): Promise<boolean> => {
    resolve();
    return outcome();
  });
  return promise;
}

const signOut = page.getByRole("button", {
  name: ACCOUNT_COPY.signOut,
  exact: true,
});

// This browser has a push subscription for the site, which unsubscribe
// unsubscribes.
function stubPushSubscription(): void {
  vi.stubGlobal("PushManager", (): void => undefined);
  vi.stubGlobal(
    "Notification",
    Object.assign((): void => undefined, { permission: "granted" }),
  );
  Object.defineProperty(navigator.serviceWorker, "getRegistration", {
    configurable: true,
    value: (): Promise<unknown> =>
      Promise.resolve({
        pushManager: {
          getSubscription: (): Promise<unknown> =>
            Promise.resolve({
              endpoint: "https://push.example.test/1",
              unsubscribe,
            }),
        },
      }),
  });
}

beforeEach(() => {
  stubPushSubscription();
});

afterEach(() => {
  Reflect.deleteProperty(navigator.serviceWorker, "getRegistration");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("signing out stops notifications to this browser", () => {
  test("signing out unsubscribes this browser from push", async () => {
    const unsubscribed = unsubscribing(() => Promise.resolve(true));
    const signedOut = signingOut();
    await render(<SignOutButtons />);

    await signOut.click();

    await Promise.all([unsubscribed, signedOut]);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(actions.signOutAction).toHaveBeenCalledOnce();
  });

  test("a browser that fails to unsubscribe still signs out", async () => {
    const unsubscribed = unsubscribing(() =>
      Promise.reject(new Error("No push service")),
    );
    const signedOut = signingOut();
    await render(<SignOutButtons />);

    await signOut.click();

    await Promise.all([unsubscribed, signedOut]);
    expect(actions.signOutAction).toHaveBeenCalledOnce();
  });
});
