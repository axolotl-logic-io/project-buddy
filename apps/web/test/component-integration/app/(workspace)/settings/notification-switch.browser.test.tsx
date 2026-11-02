// "use_case_turn_on_notifications" in use-cases/notifications.md, on the
// Settings page, in Chromium and WebKit, with this browser's own push
// support: the browser asks for permission only once she switches
// notifications on, and a browser that can't show them, or where she
// blocked them, says what to do instead of offering the switch. The browser's
// Notification permission is a fake, so no real prompt opens.
// notification-switch-on.browser.test.tsx covers the switch once it is on;
// test/component-integration/push/notifications.server.test.ts the server.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { NotificationSwitch } from "@/app/(workspace)/settings/notification-switch.tsx";
import type {
  sendTestNotificationAction,
  turnOffNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";
import { NOTIFICATIONS_COPY } from "@/ui/copy/settings.ts";

// Saving the subscription is a round trip to the server, which the server
// test covers.
const actions = vi.hoisted(() => ({
  turnOnNotificationsAction: vi.fn<typeof turnOnNotificationsAction>(),
  turnOffNotificationsAction: vi.fn<typeof turnOffNotificationsAction>(),
  sendTestNotificationAction: vi.fn<typeof sendTestNotificationAction>(),
}));
vi.mock("@/push/notification-actions.ts", () => actions);

const PUBLIC_KEY = "site-key";

const requestPermission = vi.fn<() => Promise<NotificationPermission>>();

// This browser's Notification permission, as she has set it so far, and
// the prompt that asks her, which answers with requestPermission.
function stubNotificationPermission(permission: NotificationPermission): void {
  vi.stubGlobal(
    "Notification",
    Object.assign((): void => undefined, { permission, requestPermission }),
  );
}

const notificationsSwitch = page.getByRole("switch", {
  name: NOTIFICATIONS_COPY.switchLabel,
});

beforeEach(() => {
  // WebKit offers push only to an app on the Home Screen; these tests are
  // about the page, so every browser here can receive push.
  vi.stubGlobal("PushManager", (): void => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("use_case_turn_on_notifications", () => {
  test("the browser asks for permission only when she switches them on", async () => {
    stubNotificationPermission("default");
    requestPermission.mockResolvedValue("denied");
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);
    await expect.element(notificationsSwitch).toBeEnabled();

    expect(requestPermission).not.toHaveBeenCalled();
    await expect.element(notificationsSwitch).not.toBeChecked();

    await notificationsSwitch.click();

    await expect
      .element(page.getByText(NOTIFICATIONS_COPY.blocked))
      .toBeVisible();
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(actions.turnOnNotificationsAction).not.toHaveBeenCalled();
  });

  test("dismissing the browser's prompt leaves them off", async () => {
    stubNotificationPermission("default");
    requestPermission.mockResolvedValue("default");
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);

    await notificationsSwitch.click();

    await expect.element(notificationsSwitch).toBeEnabled();
    await expect.element(notificationsSwitch).not.toBeChecked();
    expect(actions.turnOnNotificationsAction).not.toHaveBeenCalled();
  });

  test("where she blocked them, it says how to allow them, with no switch", async () => {
    stubNotificationPermission("denied");
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);

    await expect
      .element(page.getByText(NOTIFICATIONS_COPY.blocked))
      .toBeVisible();
    await expect.element(notificationsSwitch).not.toBeInTheDocument();
  });

  test("a browser that can't receive them says to add the app to the Home Screen", async () => {
    stubNotificationPermission("default");
    vi.stubGlobal("PushManager", undefined);
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);

    await expect
      .element(page.getByText(NOTIFICATIONS_COPY.unsupported))
      .toBeVisible();
    await expect.element(notificationsSwitch).not.toBeInTheDocument();
  });

  test("a site without VAPID keys says notifications aren't set up", async () => {
    await render(<NotificationSwitch publicKey={undefined} />);

    await expect
      .element(page.getByText(NOTIFICATIONS_COPY.notSetUp))
      .toBeVisible();
    await expect.element(notificationsSwitch).not.toBeInTheDocument();
  });
});
