// Lets a development script running under plain Node import the site's own
// modules, such as its stores, instead of repeating what they do. The site
// names its modules by the @/ path alias and Next's by extensionless
// subpaths, such as next/navigation, which only Next's and Vitest's resolvers
// understand. Importing this module registers a resolver hook that maps both;
// the script then imports the site's modules with dynamic import(), which
// runs after this module, where a static import would run before it.
import { type ResolveHookSync, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE = pathToFileURL(
  `${resolve(dirname(fileURLToPath(import.meta.url)), "../../src")}/`,
);
const SITE_MODULE = /^@\/(?<path>.+)$/u;
const NEXT_SUBPATH = /^next\/[\w/-]+$/u;

// Resolves @/ to the site's source and next/SUBPATH to its file.
const resolveSiteModule: ResolveHookSync = (
  specifier: string,
  context: Parameters<ResolveHookSync>[1],
  nextResolve: Parameters<ResolveHookSync>[2],
): ReturnType<ResolveHookSync> => {
  const { path: site } = SITE_MODULE.exec(specifier)?.groups ?? {};
  if (site !== undefined) {
    return nextResolve(new URL(site, SOURCE).href, context);
  }
  if (NEXT_SUBPATH.test(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
};

registerHooks({ resolve: resolveSiteModule });
