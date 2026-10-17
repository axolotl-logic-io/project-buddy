// The command `npm run check:build-fonts`: checks src/themes/theme-font-urls.ts
// against the CSS the last `npm run build` wrote under `.next/static/`
// (build-font-urls.ts). `npm run test:e2e` runs it on the build it tests.
// Prints each drift and exits with status 1 if the map has drifted or there
// is no built CSS. As the command's entry point, it is the one place here
// that reads the build and prints to the terminal.
import { glob, readFile } from "node:fs/promises";
import { exit } from "node:process";
import { type BuiltSheet, buildFontUrlDrift } from "./build-font-urls.ts";

const STATIC_DIRECTORY = ".next/static";

const sheets: BuiltSheet[] = [];
for await (const path of glob("**/*.css", { cwd: STATIC_DIRECTORY })) {
  sheets.push({
    path,
    text: await readFile(`${STATIC_DIRECTORY}/${path}`, "utf8"),
  });
}

const drift = buildFontUrlDrift(sheets);
for (const line of drift) {
  console.error(`theme-font-urls.ts has drifted from the build: ${line}`);
}
if (drift.length > 0) {
  exit(1);
}
console.log(
  `theme-font-urls.ts matches the @font-face files of ${sheets.length} built stylesheets.`,
);
