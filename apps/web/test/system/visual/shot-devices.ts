// The phones the visual tests also shoot every page on, as Playwright
// emulates them: browser, screen, pixel ratio, touch and user agent. Each
// device is a project of its own in playwright.config.ts, because a device
// fixes the browser, which a test can't change; describeVisualPage tags each
// device's tests, and the device's project runs only those.
import { devices } from "@playwright/test";

// Playwright's description of a device, which it doesn't export by name.
type DeviceDescriptor = (typeof devices)[string];

interface ShotDevice {
  // The device's part of each screenshot's name, such as "iphone-15", and of
  // its project's name.
  readonly name: string;
  readonly descriptor: DeviceDescriptor;
}

const SHOT_DEVICES: readonly ShotDevice[] = [
  { name: "iphone-15", descriptor: devices["iPhone 15"] },
  { name: "pixel-7", descriptor: devices["Pixel 7"] },
];

const DEVICE_TAG_PREFIX = "@device-";

// Selects every device's tests, which the Desktop Chrome project leaves out.
const ANY_DEVICE_TAG = new RegExp(DEVICE_TAG_PREFIX, "u");

// The tag on a device's tests.
function shotDeviceTag(device: ShotDevice): string {
  return `${DEVICE_TAG_PREFIX}${device.name}`;
}

// Selects the device's tests, for its project: its tag, and not a longer tag
// that starts with it.
function shotDeviceGrep(device: ShotDevice): RegExp {
  return new RegExp(`${shotDeviceTag(device)}(?![\\w-])`, "u");
}

export type { ShotDevice };
export { ANY_DEVICE_TAG, SHOT_DEVICES, shotDeviceGrep, shotDeviceTag };
