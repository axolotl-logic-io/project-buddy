"use client";

import { type JSX, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { SettingSwitch } from "@/components/ui/setting-switch.tsx";
import { sendTestNotificationAction } from "@/push/notification-actions.ts";
import {
  type NotificationsState,
  readNotificationsState,
  turnOffNotifications,
  turnOnNotifications,
} from "@/push/push-device.ts";
import { NOTIFICATIONS_COPY } from "@/ui/copy/settings.ts";

// What the test button has done: nothing yet, sending, or what came of it.
type TestStatus = "idle" | "sending" | "sent" | "not-sent" | "failed";

const TEST_STATUS_COPY: Readonly<Record<TestStatus, string>> = {
  idle: "",
  sending: NOTIFICATIONS_COPY.sendingTest,
  sent: NOTIFICATIONS_COPY.testSent,
  "not-sent": NOTIFICATIONS_COPY.testNotSent,
  failed: NOTIFICATIONS_COPY.failed,
};

// The button that sends her a test notification, and what came of it.
function TestNotification(): JSX.Element {
  const [status, setStatus] = useState<TestStatus>("idle");
  const send = useCallback((): void => {
    setStatus("sending");
    sendTestNotificationAction().then(setStatus, () => {
      setStatus("failed");
    });
  }, []);
  return (
    <div className="flex flex-col gap-2">
      <Button
        className="self-start"
        disabled={status === "sending"}
        onClick={send}
        variant="secondary"
      >
        {NOTIFICATIONS_COPY.sendTest}
      </Button>
      <FormStatus>{TEST_STATUS_COPY[status]}</FormStatus>
    </div>
  );
}

// Turns notifications on or off on this device, and says where they stand
// after.
async function switchedTo(
  on: boolean,
  publicKey: string,
): Promise<NotificationsState> {
  if (on) {
    return turnOnNotifications(publicKey);
  }
  await turnOffNotifications();
  return "off";
}

// The switch for notifications on this device, once the browser has said
// where they stand, with the test button while they are on. A browser that
// can't receive them, or where she has blocked them, gets a note instead.
function DeviceNotifications({
  publicKey,
}: {
  readonly publicKey: string;
}): JSX.Element {
  const [state, setState] = useState<NotificationsState | "checking">(
    "checking",
  );
  const [change, setChange] = useState<"idle" | "saving" | "failed">("idle");

  useEffect(() => {
    let current = true;
    function show(read: NotificationsState): void {
      if (current) {
        setState(read);
      }
    }
    function showOff(): void {
      show("off");
    }
    readNotificationsState().then(show, showOff);
    return (): void => {
      current = false;
    };
  }, []);

  const switchNotifications = useCallback(
    (on: boolean): void => {
      setChange("saving");
      switchedTo(on, publicKey).then(
        (read) => {
          setState(read);
          setChange("idle");
        },
        () => {
          setChange("failed");
        },
      );
    },
    [publicKey],
  );

  if (state === "unsupported") {
    return <p className="field-hint">{NOTIFICATIONS_COPY.unsupported}</p>;
  }
  if (state === "blocked") {
    return <p className="field-hint">{NOTIFICATIONS_COPY.blocked}</p>;
  }
  let hint: string = NOTIFICATIONS_COPY.switchHint;
  if (state === "checking") {
    hint = NOTIFICATIONS_COPY.checking;
  }
  return (
    <>
      <SettingSwitch
        disabled={change === "saving" || state === "checking"}
        hint={hint}
        label={NOTIFICATIONS_COPY.switchLabel}
        on={state === "on"}
        onSwitch={switchNotifications}
      />
      {change === "failed" && <Alert>{NOTIFICATIONS_COPY.failed}</Alert>}
      {state === "on" && <TestNotification />}
    </>
  );
}

// The Settings page's notifications section, below its heading: the
// switch for this device, or a note that the site has no VAPID keys yet
// (publicKey undefined).
export function NotificationSwitch({
  publicKey,
}: {
  readonly publicKey: string | undefined;
}): JSX.Element {
  if (publicKey === undefined) {
    return <p className="field-hint">{NOTIFICATIONS_COPY.notSetUp}</p>;
  }
  return <DeviceNotifications publicKey={publicKey} />;
}
