import {
  isCSSRequest,
  parseSync,
  type TransformResult,
  type ViteDevServer,
} from "vite";
import type { Plugin } from "vitest/config";

// A stylesheet requested as CSS rather than as a JS module, which the
// transform middleware serves as text/css.
const DIRECT_QUERY = /[?&]direct\b/u;
const LINE_BREAK = /\r?\n/u;

const PLUGIN_NAME = "project-buddy:served-syntax-check";

type DevEnvironment = ViteDevServer["environments"]["client"];

interface ParseFailure {
  message: string;
  // The UTF-16 offset in the code of the first parse error.
  offset: number;
}

interface Position {
  line: number;
  column: number;
}

// The first error parsing code as an ES module, or undefined if it parses.
function parseFailure(code: string): ParseFailure | undefined {
  const { errors } = parseSync("served.js", code, {
    sourceType: "module",
    lang: "js",
  });
  const error = errors.find(({ severity }) => severity === "Error");
  if (error === undefined) {
    return undefined;
  }
  return { message: error.message, offset: error.labels[0]?.start ?? 0 };
}

// The 1-based line and column of offset in code.
function positionAt(code: string, offset: number): Position {
  const before = code.slice(0, offset);
  const lineStart = before.lastIndexOf("\n") + 1;
  return {
    line: before.split("\n").length,
    column: offset - lineStart + 1,
  };
}

// The numbered lines of code from the line before line to the line after.
function codeFrame(code: string, line: number): string {
  const lines = code.split(LINE_BREAK);
  const first = Math.max(1, line - 1);
  const last = Math.min(lines.length, line + 1);
  const width = String(last).length;
  return lines
    .slice(first - 1, last)
    .map((text, index) => {
      const number = first + index;
      const label = `${String(number).padStart(width)} | ${text}`;
      if (number === line) {
        return `> ${label}`;
      }
      return `  ${label}`;
    })
    .join("\n");
}

function failureReport(
  file: string,
  code: string,
  failure: ParseFailure,
): string {
  const { line, column } = positionAt(code, failure.offset);
  return [
    `The browser was served a module that does not parse: ${file}:${line}:${column}`,
    failure.message,
    codeFrame(code, line),
  ].join("\n");
}

// The served module's file relative to the server's root, or its URL for a
// module with no file, such as a virtual one. A file outside the root keeps
// its absolute path.
async function servedFile(
  environment: DevEnvironment,
  url: string,
): Promise<string> {
  const module = await environment.moduleGraph.getModuleByUrl(url);
  const file = module?.file ?? url;
  const rootPrefix = `${environment.config.root}/`;
  if (file.startsWith(rootPrefix)) {
    return file.slice(rootPrefix.length);
  }
  return file;
}

// Wraps environment's transformRequest, through which Vite serves every
// module to the browser after all its plugins have run, so that each
// result is parsed once and a JS module that doesn't parse is logged.
// Results are returned unchanged.
function checkServedModules(environment: DevEnvironment): void {
  const transformRequest = environment.transformRequest.bind(environment);
  const checked = new WeakSet<object>();
  environment.transformRequest = async (
    url: string,
  ): Promise<TransformResult | null> => {
    const result = await transformRequest(url);
    if (
      result === null ||
      checked.has(result) ||
      (isCSSRequest(url) && DIRECT_QUERY.test(url))
    ) {
      return result;
    }
    checked.add(result);
    const failure = parseFailure(result.code);
    if (failure !== undefined) {
      const file = await servedFile(environment, url);
      environment.logger.error(failureReport(file, result.code, failure));
    }
    return result;
  };
}

// A Vite plugin for the browser test projects: when the browser's (client)
// environment serves a JavaScript module that doesn't parse as an ES module,
// it logs an error naming the module's file, the line and column of the
// parse error in the served (transformed) code, the parser's message, and
// the lines around it, so a test file that fails to import with a
// SyntaxError can be traced to the code the browser got (#386). What is
// served doesn't change.
function servedSyntaxCheck(): Plugin {
  return {
    name: PLUGIN_NAME,
    configureServer(server: ViteDevServer): void {
      checkServedModules(server.environments.client);
    },
  };
}

export { servedSyntaxCheck };
