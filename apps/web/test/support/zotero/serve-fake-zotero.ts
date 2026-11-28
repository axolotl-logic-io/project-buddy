// Runs the fake Zotero for the system tests, as Playwright's first web
// server (playwright.config.ts). It prints its origin once listening, and
// Playwright copies the line's named parts into ZOTERO_API_ORIGIN and
// ZOTERO_OAUTH_ORIGIN for the site's server and the tests.

import process from "node:process";
import { startFakeZotero } from "./fake-zotero.ts";

const { origin }: { readonly origin: string } = await startFakeZotero();
process.stdout.write(
  `Fake Zotero ZOTERO_API_ORIGIN=${origin} ZOTERO_OAUTH_ORIGIN=${origin}\n`,
);
