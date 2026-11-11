import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { expect, test, vi } from "vitest";

interface WorkerEvent {
  readonly waitUntil: (promise: Promise<unknown>) => void;
}
type Listener = (event: WorkerEvent) => void;

async function worker(unsubscribe: () => Promise<boolean>): Promise<{
  readonly dispatch: (event: string) => Promise<unknown>;
  readonly unregister: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  readonly skipWaiting: ReturnType<typeof vi.fn<() => Promise<void>>>;
  readonly listeners: Map<string, Listener>;
}> {
  const listeners = new Map<string, Listener>();
  const unregister = vi.fn(async (): Promise<boolean> => true);
  const skipWaiting = vi.fn(async (): Promise<void> => undefined);
  const source = await readFile("public/sw.js", "utf8");
  runInNewContext(source, {
    registration: {
      pushManager: { getSubscription: async () => ({ unsubscribe }) },
      unregister,
    },
    skipWaiting,
    addEventListener: (event: string, listener: Listener): void => {
      listeners.set(event, listener);
    },
  });
  return {
    dispatch: (event: string): Promise<unknown> => {
      let completion: Promise<unknown> = Promise.resolve();
      listeners.get(event)?.({
        waitUntil: (promise: Promise<unknown>): void => {
          completion = promise;
        },
      });
      return completion;
    },
    unregister,
    skipWaiting,
    listeners,
  };
}

test("the older worker activates immediately and retires its subscription and registration", async () => {
  const unsubscribe = vi.fn(async (): Promise<boolean> => true);
  const retired = await worker(unsubscribe);
  await retired.dispatch("install");
  expect(retired.skipWaiting).toHaveBeenCalledOnce();
  await retired.dispatch("activate");
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(retired.unregister).toHaveBeenCalledOnce();
  expect([...retired.listeners.keys()]).toEqual(["install", "activate"]);
});

test("failed unsubscribe still unregisters the older worker", async () => {
  const retired = await worker(
    (): Promise<boolean> =>
      Promise.reject(new Error("Push service unavailable")),
  );
  await expect(retired.dispatch("activate")).rejects.toThrow(
    "Push service unavailable",
  );
  expect(retired.unregister).toHaveBeenCalledOnce();
});
