// @vitest-environment node
// An .mts file, as vitest.config.mts is: tsc reads it after the .ts files, so
// the browser matcher types vitest/node brings in don't replace the
// toHaveTextContent(RegExp) that vitest.setup.ts's jest-dom gives the specs.
import { afterEach, describe, expect, test } from "vitest";
import type {
  Plugin,
  TestProjectConfiguration,
  TestProjectInlineConfiguration,
  ViteUserConfig,
} from "vitest/config";
import { createViteServer } from "vitest/node";
import { servedSyntaxCheck } from "./vitest.browser-syntax.mts";
import webConfig from "./vitest.config.mts";

// The app's folder, where the browser projects' Vite servers run.
const ROOT: string = import.meta.dirname;
// One of the app's own modules, served from memory by servedModule().
const MODULE_URL = "/src/served-module.js";
const MODULE_FILE = `${ROOT}${MODULE_URL}`;
const SOURCE = "export const before = 1;\nexport const after = 2;\n";
// What a broken transform serves in its place: a return statement at the
// module's top level, as in #386's "Illegal return statement", on line 2,
// column 1.
const BEFORE_LINE = "export const before = 1;";
const BROKEN_LINE = "return before;";
const AFTER_LINE = "export const after = 2;";
const BROKEN_CODE = [BEFORE_LINE, BROKEN_LINE, AFTER_LINE, ""].join("\n");
const BROKEN_POSITION = "src/served-module.js:2:1";

type ViteServer = Awaited<ReturnType<typeof createViteServer>>;
type ViteLogger = NonNullable<ViteUserConfig["customLogger"]>;
type PluginOption = NonNullable<
  TestProjectInlineConfiguration["plugins"]
>[number];

const servers: ViteServer[] = [];

// Serves MODULE_URL from memory, with SOURCE as its code.
function servedModule(): Plugin {
  return {
    name: "test:served-module",
    resolveId(source: string): string | undefined {
      return new Map([[MODULE_URL, MODULE_FILE]]).get(source);
    },
    load(id: string): string | undefined {
      return new Map([[MODULE_FILE, SOURCE]]).get(id);
    },
  };
}

// Breaks the served module as the last post transform, after the check's
// own plugin, as Vitest's browser plugins transform after the projects' own.
function breaksServedModule(): Plugin {
  return {
    name: "test:breaks-served-module",
    enforce: "post",
    transform: {
      order: "post",
      handler(_code: string, id: string): string | undefined {
        return new Map([[MODULE_FILE, BROKEN_CODE]]).get(id);
      },
    },
  };
}

// A Vite logger that keeps the errors it is given in errors.
function errorsLogger(errors: string[]): ViteLogger {
  return {
    hasWarned: false,
    info: (): undefined => undefined,
    warn: (): undefined => undefined,
    warnOnce: (): undefined => undefined,
    error(message: string): void {
      errors.push(message);
    },
    clearScreen: (): undefined => undefined,
    hasErrorLogged: (): boolean => false,
  };
}

// A dev server with plugins, as a browser project's, with an optimizer
// cache of its own, named name, and the errors it logs.
async function serverWith(
  name: string,
  plugins: Plugin[],
): Promise<{ server: ViteServer; errors: string[] }> {
  const errors: string[] = [];
  const server = await createViteServer({
    root: ROOT,
    configFile: false,
    customLogger: errorsLogger(errors),
    server: { middlewareMode: true, ws: false },
    cacheDir: `${ROOT}/node_modules/.vite/browser-syntax-test/${name}`,
    plugins,
  });
  servers.push(server);
  return { server, errors };
}

function isInlineProject(
  project: TestProjectConfiguration,
): project is TestProjectInlineConfiguration {
  return typeof project === "object" && !(project instanceof Promise);
}

// The names of the plugins options holds, nested arrays and promises
// included.
async function pluginNames(options: PluginOption[]): Promise<string[]> {
  const names = await Promise.all(
    options.map(async (option): Promise<string[]> => {
      const plugin = await option;
      if (Array.isArray(plugin)) {
        return await pluginNames(plugin);
      }
      if (plugin === false || plugin === null || plugin === undefined) {
        return [];
      }
      return [plugin.name];
    }),
  );
  return names.flat();
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("a served module that does not parse", () => {
  test("is reported with its position and the lines around it", async () => {
    const { server, errors } = await serverWith("broken", [
      servedModule(),
      servedSyntaxCheck(),
      breaksServedModule(),
    ]);

    await server.environments.client.transformRequest(MODULE_URL);

    const report = errors.join("\n");
    expect(report).toContain(BROKEN_POSITION);
    expect(report).toContain(BEFORE_LINE);
    expect(report).toContain(BROKEN_LINE);
    expect(report).toContain(AFTER_LINE);
  });

  test("is still served as transformed", async () => {
    const { server } = await serverWith("served", [
      servedModule(),
      servedSyntaxCheck(),
      breaksServedModule(),
    ]);

    const served =
      await server.environments.client.transformRequest(MODULE_URL);

    expect(served?.code).toContain(BROKEN_LINE);
  });
});

test("a served module that parses is not reported", async () => {
  const { server, errors } = await serverWith("parses", [
    servedModule(),
    servedSyntaxCheck(),
  ]);

  const served = await server.environments.client.transformRequest(MODULE_URL);

  expect(served?.code).toContain(BEFORE_LINE);
  expect(errors).toEqual([]);
});

test("every browser project serves through the check", async () => {
  const browserProjects = (webConfig.test?.projects ?? [])
    .filter(isInlineProject)
    .filter((project) => project.test?.browser?.enabled === true);
  const { name } = servedSyntaxCheck();

  const projectPlugins = await Promise.all(
    browserProjects.map((project) => pluginNames(project.plugins ?? [])),
  );

  expect(browserProjects.length).toBeGreaterThan(0);
  for (const names of projectPlugins) {
    expect(names).toContain(name);
  }
});
