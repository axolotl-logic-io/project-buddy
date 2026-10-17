import type { Plugin } from "vitest/config";

// A Vite plugin for the browser test projects: when the browser's (client)
// environment serves a JavaScript module that doesn't parse as an ES module,
// it logs an error naming the module's file, the line and column of the
// parse error in the served (transformed) code, the parser's message, and
// the lines around it, so a test file that fails to import with a
// SyntaxError can be traced to the code the browser got (#386).
function servedSyntaxCheck(): Plugin {
  throw new Error("servedSyntaxCheck is not implemented yet (#386)");
}

export { servedSyntaxCheck };
