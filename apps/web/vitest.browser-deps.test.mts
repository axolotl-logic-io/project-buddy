// @vitest-environment node
// An .mts file, as vitest.config.mts is: tsc reads it after the .ts files, so
// the browser matcher types vitest/node brings in don't replace the
// toHaveTextContent(RegExp) that vitest.setup.ts's jest-dom gives the specs.
import { afterEach, expect, test } from "vitest";
import type { ViteUserConfig } from "vitest/config";
import { createViteServer } from "vitest/node";
import { prebundledBrowserDeps } from "./vitest.browser-deps.mts";

// The app's folder, where the browser projects' Vite servers run.
const ROOT: string = import.meta.dirname;
// One of the app's own files, as the importer.
const APP_FILE = `${ROOT}/src/x.tsx`;
// Installed, but imported only by Node unit tests, so not pre-bundled.
const UNLISTED_PACKAGE = "culori";
const MISSING_DEP_ERROR =
  /"culori", imported by src\/x\.tsx.+vitest\.browser-deps\.mts/u;

type ViteServer = Awaited<ReturnType<typeof createViteServer>>;

const servers: ViteServer[] = [];

// A dev server with the plugin, as a browser project has, plus config, with
// an optimizer cache of its own, named name.
async function serverWith(
  name: string,
  config: ViteUserConfig = {},
): Promise<ViteServer> {
  const server = await createViteServer({
    ...config,
    root: ROOT,
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    cacheDir: `${ROOT}/node_modules/.vite/browser-deps-test/${name}`,
    plugins: [prebundledBrowserDeps()],
  });
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

test("a bare import missing from the list fails, naming the package", async () => {
  const { pluginContainer } = (await serverWith("missing")).environments.client;

  await expect(
    pluginContainer.resolveId(UNLISTED_PACKAGE, APP_FILE),
  ).rejects.toThrow(MISSING_DEP_ERROR);
});

test("a bare import the resolved list holds passes", async () => {
  const { pluginContainer } = (
    await serverWith("listed", {
      optimizeDeps: { include: [UNLISTED_PACKAGE] },
    })
  ).environments.client;

  await expect(
    pluginContainer.resolveId(UNLISTED_PACKAGE, APP_FILE),
  ).resolves.toMatchObject({ id: expect.stringContaining(UNLISTED_PACKAGE) });
});

test("dependency discovery is off", async () => {
  const { config } = (await serverWith("discovery")).environments.client;

  expect(config.optimizeDeps.noDiscovery).toBe(true);
});
