// Vitest's global setup for the server tests (vitest.server.config.mts):
// starts one fake Zotero for the whole run and gives its origin to every
// test file, whose setup (vitest.server-setup.ts) points the site's Zotero
// client at it.
import type { TestProject } from "vitest/node";
import { startFakeZotero } from "./fake-zotero.ts";

declare module "vitest" {
  interface ProvidedContext {
    zoteroOrigin: string;
  }
}

let close: (() => Promise<void>) | undefined;

async function setup(project: TestProject): Promise<void> {
  const { origin, server } = await startFakeZotero();
  project.provide("zoteroOrigin", origin);
  close = (): Promise<void> =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
}

async function teardown(): Promise<void> {
  await close?.();
}

export { setup, teardown };
