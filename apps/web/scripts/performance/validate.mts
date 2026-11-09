import process from "node:process";
import { parseArgs } from "node:util";
import { z } from "zod";
import { validateAuditDirectory } from "./validate-output.mts";

const MINIMUM_SAMPLES = 3;
const { values } = parseArgs({
  options: {
    output: { type: "string" },
    samples: { type: "string", default: "3" },
  },
});
try {
  const directory = z.string().startsWith("/").parse(values.output);
  const samples = z.coerce
    .number()
    .int()
    .min(MINIMUM_SAMPLES)
    .parse(values.samples);
  await validateAuditDirectory(directory, samples);
  console.info(
    "Compressed audit artifacts passed validation. Review allowed filmstrip pixels manually.",
  );
} catch {
  console.error(
    "Audit validation failed; incomplete or unsafe compressed artifacts.",
  );
  process.exitCode = 1;
}
