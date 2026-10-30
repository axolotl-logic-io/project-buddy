import type { Plugin, ViteUserConfig } from "vitest/config";

// The packages the browser tests, vitest.browser-setup.ts and the src/ code
// they load import in the browser, which Vite pre-bundles before the tests
// start. Vite would otherwise discover a missing one mid-run and optimize it
// again, which changes the deps' version hash and reloads or rejects the test
// modules still loading (#375, and next/cache before it). So discovery is off,
// and an import missing from here fails, naming itself. This holds only the
// app's own imports: Vitest and @vitejs/plugin-react add theirs.
const PREBUNDLED_DEPS: string[] = [
  "@ai-sdk/anthropic",
  "@ai-sdk/provider",
  "@ai-sdk/react",
  "@assistant-ui/react",
  "@assistant-ui/react-ai-sdk",
  "@neondatabase/serverless",
  "@streamdown/code",
  "ai",
  "drizzle-orm",
  "drizzle-orm/neon-http",
  "drizzle-orm/pg-core",
  "next/cache",
  "next/headers",
  "next/link",
  "next/image",
  "next/navigation",
  "next/server",
  "radix-ui",
  "react-dom/client",
  "react-dom/server",
  "streamdown",
  "vitest-browser-react",
  "zod",
];

// Specifiers that name a file or a module rather than a package: relative
// and absolute paths, the @/ alias for src/, and ids with a scheme such as
// node: or virtual:.
const PATH_OR_ALIAS = /^(?:\.|\/|@\/)/u;
const URL_SCHEME = /^[a-z][\d+.a-z-]*:/iu;
// Stylesheets and pages, which Vite never pre-bundles, such as the CSS
// imports of src/ and the browser runner's index.html.
const NON_JS_PATH = /\.(?:css|html)$/u;
// Rollup's mark for a plugin's virtual module.
const VIRTUAL_ID_PREFIX = "\0";
// Separates the nested entries of optimizeDeps.include, as in "vitest > chai".
const NESTED_DEP_SEPARATOR = ">";

const PLUGIN_NAME = "project-buddy:prebundled-browser-deps";

// The Vite environment a plugin is applied to, such as the browser's.
type Environment = Parameters<NonNullable<Plugin["applyToEnvironment"]>>[0];

interface DepLists {
  include?: string[] | undefined;
  exclude?: string[] | undefined;
}

// Whether source names a JS package, which Vite would pre-bundle, rather
// than a path, an alias, a virtual module, a query, a stylesheet or a page.
function isBareJsSpecifier(source: string): boolean {
  return !(
    source.startsWith(VIRTUAL_ID_PREFIX) ||
    PATH_OR_ALIAS.test(source) ||
    URL_SCHEME.test(source) ||
    source.includes("?") ||
    NON_JS_PATH.test(source)
  );
}

// Whether importer is one of the app's own files, under root and outside
// node_modules/; a package's own imports are bundled with it.
function isAppFile(importer: string, root: string): boolean {
  return (
    importer.startsWith(`${root}/`) && !importer.includes("/node_modules/")
  );
}

// Whether the resolved lists pre-bundle source, or leave it out on purpose.
function isListed(source: string, { include, exclude }: DepLists): boolean {
  const included = (include ?? []).some(
    (entry) => entry.split(NESTED_DEP_SEPARATOR).at(-1)?.trim() === source,
  );
  return (
    included ||
    (exclude ?? []).some(
      (entry) => source === entry || source.startsWith(`${entry}/`),
    )
  );
}

function missingDepMessage(source: string, importer: string): string {
  return [
    `"${source}", imported by ${importer}, is not pre-bundled for the browser tests.`,
    "Vite's dependency discovery is off, so a missing package would be served unbundled.",
    "Add it to PREBUNDLED_DEPS in vitest.browser-deps.mts.",
  ].join(" ");
}

// In the browser's (client) environment, a plugin that fails an import of a
// package from the app's own files when the environment's resolved
// optimizeDeps lists neither include nor exclude it, naming the package and
// its importer. Vitest and plugin-react's entries are in those lists too.
function missingDepCheck(environment: Environment): Plugin | false {
  const { config, logger } = environment;
  if (config.consumer !== "client") {
    return false;
  }
  return {
    name: `${PLUGIN_NAME}:check`,
    resolveId(source: string, importer: string | undefined): undefined {
      if (
        importer === undefined ||
        !isAppFile(importer, config.root) ||
        !isBareJsSpecifier(source) ||
        isListed(source, config.optimizeDeps)
      ) {
        return;
      }
      const message = missingDepMessage(
        source,
        importer.slice(config.root.length + 1),
      );
      logger.error(message);
      throw new Error(message);
    },
  };
}

// A Vite plugin for the browser test projects: it pre-bundles
// PREBUNDLED_DEPS with dependency discovery off, and fails an import of a
// package from the app's own files that isn't pre-bundled, naming it.
function prebundledBrowserDeps(): Plugin {
  return {
    name: PLUGIN_NAME,
    // Before vite:resolve, which would resolve the package first.
    enforce: "pre",
    config(): ViteUserConfig {
      return {
        optimizeDeps: { noDiscovery: true, include: [...PREBUNDLED_DEPS] },
      };
    },
    applyToEnvironment: missingDepCheck,
  };
}

export { prebundledBrowserDeps };
