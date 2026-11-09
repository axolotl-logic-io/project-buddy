// Private fixture subprocess: keep tsx module loading out of the native runner.
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { z } from "zod";
import { seedAudit } from "./seed.mts";

const PRIVATE_FILE_MODE = 0o600;
try {
  const [filename] = z
    .tuple([z.string().startsWith("/")])
    .parse(process.argv.slice(2));
  const fixture = await seedAudit();
  await writeFile(filename, JSON.stringify(fixture), {
    mode: PRIVATE_FILE_MODE,
    flag: "wx",
  });
} catch {
  console.error("Audit fixture preparation failed.");
  process.exitCode = 1;
}
