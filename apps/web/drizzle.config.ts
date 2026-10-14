import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { readDatabaseUrlForTooling } from "./src/env.ts";

// Load .env.local and friends the way Next.js does, from the current
// directory: drizzle-kit runs from apps/web/, the app's folder.
loadEnvConfig(".");

export default defineConfig({
  dialect: "postgresql",
  // Every file in this folder defines tables, so keep tests elsewhere.
  schema: "./src/db/tables",
  out: "./drizzle",
  dbCredentials: {
    url: readDatabaseUrlForTooling(),
  },
});
