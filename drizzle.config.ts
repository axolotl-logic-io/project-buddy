import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load .env.local and friends the same way Next.js does.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Empty is allowed so `db:generate` works offline; drizzle-kit rejects an
    // empty url for commands that connect, such as `db:migrate`.
    url: process.env.DATABASE_URL ?? "",
  },
});
