import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import { argv } from "node:process";
import ts from "typescript";
import { withCopyBrief } from "./copy-briefs.ts";
import { copyDefinitions, definitionsCsv } from "./copy-glossary.ts";
import { type CopyField, copyCsv, copyFields } from "./copy-sheet.ts";

const MINIMUM_WORDS = 4;
const directory = resolve("src/ui/copy");
const files = (await readdir(directory))
  .filter((name: string): boolean => name.endsWith(".ts"))
  .sort()
  .map((name: string): string => resolve(directory, name));
const configPath = resolve("tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) {
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
}
const parsed = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  resolve("."),
);
const program = ts.createProgram(files, parsed.options);
const fields = copyFields(program, files)
  .filter((field: CopyField): boolean => field.words >= MINIMUM_WORDS)
  .map(withCopyBrief);
const output = resolve(argv[2] ?? "copy.csv");
const definitionsOutput = resolve(
  argv[3] ?? resolve(dirname(output), `${parse(output).name}-definitions.csv`),
);
if (definitionsOutput === output) {
  throw new Error(
    "The copy sheet and definitions sheet need different output paths.",
  );
}
const glossary: string = await readFile(resolve("../../GLOSSARY.md"), "utf8");
const definitions = copyDefinitions(fields, glossary);
await writeFile(output, copyCsv(fields), "utf8");
await writeFile(definitionsOutput, definitionsCsv(definitions), "utf8");
const words = fields.reduce(
  (total: number, field): number => total + field.words,
  0,
);
console.log(
  `Wrote ${output}\nFields: ${fields.length}\nWords (approx): ${words}\nWrote ${definitionsOutput}\nDefinitions: ${definitions.length}`,
);
