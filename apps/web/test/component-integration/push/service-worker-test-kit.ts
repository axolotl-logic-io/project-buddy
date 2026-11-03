// Runs the site's service worker, public/sw.js, in a server test, as a
// browser runs it: its fetches reach the site's push subscription route
// with the test's cookies, as a service worker's same-origin requests carry
// the browser's, and its pushManager hands out the fake push service's
// subscriptions (fake-push-service-test-kit.ts).
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { GET, POST } from "@/app/api/push-subscription/route.ts";
import { PUSH_SUBSCRIPTION_PATH } from "@/routes.ts";
import { requestWithSession } from "../test-database/session-test-kit.ts";
import type { FakeBrowser } from "./fake-push-service-test-kit.ts";

const SITE = "http://localhost:3494";
const SERVICE_WORKER_FILE = new URL("../../../public/sw.js", import.meta.url);

type ApplicationServerKey = ArrayBuffer | string | null;

// A browser's PushSubscription for one fake browser's subscription.
interface WorkerPushSubscription {
  readonly endpoint: string;
  readonly options: { readonly applicationServerKey: ApplicationServerKey };
  readonly toJSON: () => FakeBrowser["subscription"];
  readonly unsubscribe: () => Promise<boolean>;
}

interface ServiceWorker {
  // Fires pushsubscriptionchange, as the browser does when it drops
  // oldSubscription, and waits for the service worker to finish with it.
  readonly changeSubscription: (
    oldSubscription: WorkerPushSubscription | null,
  ) => Promise<void>;
  // The key the service worker subscribed with each time, as bytes.
  readonly subscribedWith: () => readonly Buffer[];
  // Whether the service worker unsubscribed the subscription it made.
  readonly unsubscribed: () => boolean;
}

// The PushSubscription the browser has for browser, made with key, or with
// no key it reports, as some browsers do.
function pushSubscriptionOf(
  browser: FakeBrowser,
  key: ApplicationServerKey,
  onUnsubscribe: () => void = (): void => undefined,
): WorkerPushSubscription {
  return {
    endpoint: browser.subscription.endpoint,
    options: { applicationServerKey: key },
    toJSON: (): FakeBrowser["subscription"] => browser.subscription,
    unsubscribe: (): Promise<boolean> => {
      onUnsubscribe();
      return Promise.resolve(true);
    },
  };
}

// A key pushManager.subscribe takes, as bytes: URL-safe base64 or a buffer.
function keyBytes(key: ArrayBuffer | string): Buffer {
  if (typeof key === "string") {
    return Buffer.from(key, "base64url");
  }
  return Buffer.from(key);
}

// The site's answer to a fetch the service worker makes, from the route
// handler that serves it.
function siteFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const target = new URL(url, SITE);
  if (target.pathname !== PUSH_SUBSCRIPTION_PATH) {
    throw new Error(`The service worker fetched ${url}`);
  }
  const request = requestWithSession(target.href, init);
  if (request.method === "POST") {
    return POST(request);
  }
  return Promise.resolve(GET());
}

// Starts the service worker in a browser where subscribing again gives
// renewed's subscription.
async function startServiceWorker(
  renewed: FakeBrowser,
): Promise<ServiceWorker> {
  const source = await readFile(SERVICE_WORKER_FILE, "utf8");
  const listeners = new Map<string, (event: unknown) => void>();
  const keys: Buffer[] = [];
  let unsubscribed = false;
  const scope = {
    location: { origin: SITE },
    fetch: siteFetch,
    addEventListener: (
      type: string,
      listener: (event: unknown) => void,
    ): void => {
      listeners.set(type, listener);
    },
    registration: {
      pushManager: {
        subscribe: ({
          applicationServerKey,
        }: {
          readonly applicationServerKey: ArrayBuffer | string;
        }): Promise<WorkerPushSubscription> => {
          keys.push(keyBytes(applicationServerKey));
          return Promise.resolve(
            pushSubscriptionOf(renewed, applicationServerKey, () => {
              unsubscribed = true;
            }),
          );
        },
      },
    },
  };
  // The service worker reaches the browser only through globalThis, which
  // in its context is scope.
  runInNewContext(source, scope, { filename: "sw.js" });

  return {
    changeSubscription: async (
      oldSubscription: WorkerPushSubscription | null,
    ): Promise<void> => {
      const waits: Promise<unknown>[] = [];
      listeners.get("pushsubscriptionchange")?.({
        oldSubscription,
        newSubscription: null,
        waitUntil: (promise: Promise<unknown>): void => {
          waits.push(promise);
        },
      });
      await Promise.all(waits);
    },
    subscribedWith: (): readonly Buffer[] => keys,
    unsubscribed: (): boolean => unsubscribed,
  };
}

export type { ServiceWorker, WorkerPushSubscription };
export { pushSubscriptionOf, startServiceWorker };
