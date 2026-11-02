// "use_case_turn_on_notifications" in use-cases/notifications.md, on the
// Settings page once notifications are on for this device, in Chromium and
// WebKit: she sends herself a test notification and sees what came of it,
// and switching them off takes the test away. This device's push
// subscription is a fake (a headless browser has no push service);
// notification-switch.browser.test.tsx checks the real permission flow.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { NotificationSwitch } from "@/app/(workspace)/settings/notification-switch.tsx";
import type {
  sendTestNotificationAction,
  turnOffNotificationsAction,
  turnOnNotificationsAction,
} from "@/push/notification-actions.ts";
import type {
  readNotificationsState,
  turnOffNotifications,
  turnOnNotifications,
} from "@/push/push-device.ts";
import { NOTIFICATIONS_COPY } from "@/ui/copy/settings.ts";

const actions = vi.hoisted(() => ({
  turnOnNotificationsAction: vi.fn<typeof turnOnNotificationsAction>(),
  turnOffNotificationsAction: vi.fn<typeof turnOffNotificationsAction>(),
  sendTestNotificationAction: vi.fn<typeof sendTestNotificationAction>(),
}));
vi.mock("@/push/notification-actions.ts", () => actions);

const device = vi.hoisted(() => ({
  readNotificationsState: vi.fn<typeof readNotificationsState>(),
  turnOnNotifications: vi.fn<typeof turnOnNotifications>(),
  turnOffNotifications: vi.fn<typeof turnOffNotifications>(),
}));
vi.mock("@/push/push-device.ts", () => device);

const PUBLIC_KEY = "site-key";

const notificationsSwitch = page.getByRole("switch", {
  name: NOTIFICATIONS_COPY.switchLabel,
});
const sendTest = page.getByRole("button", {
  name: NOTIFICATIONS_COPY.sendTest,
});

beforeEach(() => {
  device.readNotificationsState.mockResolvedValue("on");
  device.turnOffNotifications.mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_turn_on_notifications", () => {
  test("a test notification says it was sent", async () => {
    actions.sendTestNotificationAction.mockResolvedValue("sent");
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);
    await expect.element(notificationsSwitch).toBeChecked();

    await sendTest.click();

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(NOTIFICATIONS_COPY.testSent);
  });

  test("a test notification that reached no device says so", async () => {
    actions.sendTestNotificationAction.mockResolvedValue("not-sent");
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);

    await sendTest.click();

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(NOTIFICATIONS_COPY.testNotSent);
  });

  test("switching them off turns them off here and takes the test away", async () => {
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);
    await expect.element(sendTest).toBeVisible();

    await notificationsSwitch.click();

    await expect.element(notificationsSwitch).not.toBeChecked();
    await expect.element(sendTest).not.toBeInTheDocument();
    expect(device.turnOffNotifications).toHaveBeenCalledOnce();
  });

  test("a switch that fails says so and stays as it was", async () => {
    device.readNotificationsState.mockResolvedValue("off");
    device.turnOnNotifications.mockRejectedValue(new Error("No push service"));
    await render(<NotificationSwitch publicKey={PUBLIC_KEY} />);
    await expect.element(notificationsSwitch).toBeEnabled();

    await notificationsSwitch.click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(NOTIFICATIONS_COPY.failed);
    await expect.element(notificationsSwitch).not.toBeChecked();
    await expect.element(notificationsSwitch).toBeEnabled();
  });
});
