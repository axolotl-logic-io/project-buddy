import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { readDatabaseUrlIfSet } from "./src/env.ts";

// Load .env.local and friends from the project directory the way Next.js does.
loadEnvConfig(".");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Empty is allowed so `db:generate` works offline; drizzle-kit rejects an
    // empty url for commands that connect, such as `db:migrate`.
    url: readDatabaseUrlIfSet() ?? "",
  },
});
