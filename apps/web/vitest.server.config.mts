import { defineConfig } from "vitest/config";

// The server tests (src/**/*.server.test.ts): Vitest in Node against the test
// database that .env.test names, with real users and sessions from the kit
// in src/test-database/. `npm run test:server` resets that database, loads
// .env.test and runs them; `npm test` never does, so it needs no database.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "server",
    environment: "node",
    include: ["src/**/*.server.test.ts"],
    setupFiles: ["./vitest.server-setup.ts"],
  },
});
