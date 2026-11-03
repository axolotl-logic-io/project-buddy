// The site's push settings in the push notification server tests: VAPID
// keys of their own, set before each test, with the tests' loopback push
// service allowed; and which browser the test's requests come from, as its
// push_device cookie says.
import { cookies } from "next/headers";
import { vi } from "vitest";
import { generateVAPIDKeys } from "web-push";
import { PUSH_DEVICE_COOKIE_NAME } from "@/push/push-device-cookie.ts";

const VAPID_KEYS: { readonly publicKey: string; readonly privateKey: string } =
  generateVAPIDKeys();
const VAPID_SUBJECT = "mailto:push@example.test";

// Sets the site's VAPID keys and allows the fake push service, for one
// test: `beforeEach(setPushSettings)`. Returns what puts them back.
function setPushSettings(): () => void {
  vi.stubEnv("VAPID_PUBLIC_KEY", VAPID_KEYS.publicKey);
  vi.stubEnv("VAPID_PRIVATE_KEY", VAPID_KEYS.privateKey);
  vi.stubEnv("VAPID_SUBJECT", VAPID_SUBJECT);
  vi.stubEnv("PUSH_ENDPOINTS", "loopback");
  return (): void => {
    vi.unstubAllEnvs();
  };
}

// Leaves the site without VAPID keys, as before they are set up.
function unsetVapidKeys(): void {
  vi.stubEnv("VAPID_PUBLIC_KEY", "");
  vi.stubEnv("VAPID_PRIVATE_KEY", "");
  vi.stubEnv("VAPID_SUBJECT", "");
}

// Makes the test's requests come from a browser of its own from now on,
// whichever user is signed in, and returns the browser's id.
async function inNewBrowser(): Promise<string> {
  const device = crypto.randomUUID();
  (await cookies()).set({ name: PUSH_DEVICE_COOKIE_NAME, value: device });
  return device;
}

// Makes the test's requests come from the browser with this id again.
async function inBrowser(device: string): Promise<void> {
  (await cookies()).set({ name: PUSH_DEVICE_COOKIE_NAME, value: device });
}

export { inBrowser, inNewBrowser, setPushSettings, unsetVapidKeys, VAPID_KEYS };
