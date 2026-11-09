// Signing out unsubscribes this browser from push, in Chromium and WebKit,
// so no one's notifications come to it after, and sends its push endpoint,
// so the server finds the subscription without the browser's cookie. The Server Action deletes
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
import AccountError from "@/app/(workspace)/account/error.tsx";
import AccountLoading from "@/app/(workspace)/account/loading.tsx";
import { SignOutButtons } from "@/app/(workspace)/account/sign-out-buttons.tsx";
import { PUSH_ENDPOINT_FIELD } from "@/app/(workspace)/account/sign-out-form.ts";
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
const ENDPOINT = "https://push.example.test/1";

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

// The sign-out form's field for this browser's push endpoint.
function endpointField(container: HTMLElement): HTMLInputElement {
  const field = container.querySelector<HTMLInputElement>(
    `input[name="${PUSH_ENDPOINT_FIELD}"]`,
  );
  if (field === null) {
    throw new Error("The sign-out form has no push endpoint field");
  }
  return field;
}

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
              endpoint: ENDPOINT,
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

  test("signing out sends this browser's push endpoint", async () => {
    unsubscribe.mockResolvedValue(true);
    const signedOut = signingOut();
    const { container } = await render(<SignOutButtons />);
    await expect
      .element(page.elementLocator(endpointField(container)))
      .toHaveValue(ENDPOINT);

    await signOut.click();

    await signedOut;
    const [form] = actions.signOutAction.mock.lastCall ?? [];
    expect(form?.get(PUSH_ENDPOINT_FIELD)).toBe(ENDPOINT);
  });
});

test("Account keeps both sign-out actions while loading or showing a page error", async () => {
  const screen = await render(<AccountLoading />);
  await expect.element(signOut).toBeVisible();
  await expect
    .element(
      page.getByRole("button", {
        name: ACCOUNT_COPY.signOutEverywhere,
        exact: true,
      }),
    )
    .toBeVisible();
  const retry = vi.fn<() => void>();
  await screen.rerender(
    <AccountError error={new Error("Balance unavailable")} retry={retry} />,
  );
  await expect.element(signOut).toBeVisible();
  await expect
    .element(
      page.getByRole("button", {
        name: ACCOUNT_COPY.signOutEverywhere,
        exact: true,
      }),
    )
    .toBeVisible();
});
