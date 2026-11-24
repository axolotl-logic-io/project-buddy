// Reports which local scripts the last N T3 Code threads for this project ran,
// and which they never ran. A local script is an npm script in a workspace
// package.json, a mise task, or a file in a scripts/ folder.
//
// The report reads each thread's shell commands from T3 Code's state database.
// It counts a script as run directly when a command invokes it, and as run
// indirectly when something that ran calls it: an npm script that runs
// another, a mise task that runs an npm script, or a file that imports or
// sources another. Each entry names where the script is defined, as
// path:line, and the newest thread that ran it.
//
// Usage: node scripts/script-usage.mts [N] [--json] [--trace TEXT] [--db PATH]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";

const DEFAULT_THREADS = 20;
const DEFAULT_DB = path.join(homedir(), ".t3/userdata/statev2.sqlite");
// A worktree path ends .../worktrees/<repository>/<worktree>/.
const WORKTREE_PATH_PARTS = 3;
const TRACE_LENGTH = 300;
const SCRIPT_EXTENSION = /\.(?:[cm]?[jt]s|sh|bash|zsh|py)$/u;
const TEST_FOLDER = /(?:^|\/)(?:test|tests|__tests__|node_modules)\//u;
const TEST_FILE = /\.test\.[^/]+$/u;
const ASSIGNMENT = /^[A-Za-z_]\w*=/u;
const FD_ONLY = /^\d+$/u;
const REDIRECT = /^(?:<<<|<<-|<<|>>|>&|<&|>\||<>|<|>)/u;
const AMPERSAND_REDIRECT = /^&>>?/u;
const DUPLICATE_TARGET = /^(?:\d+|-)/u;
const RELATIVE_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](?<specifier>\.{1,2}\/[^"']+)["']/gu;
const SHELL_WITH_COMMAND = /^-[a-zA-Z]*c[a-zA-Z]*$/u;
const SHELL_WORD_BREAK = /[\s"'/]+/u;
const LEADING_TABS = /^\t+/u;
const LEADING_DOTS = /^(?:\.\.?\/)+/u;
const TRAILING_SLASH = /\/$/u;
const LEADING_COLON = /^:/u;
const PAIRED_OPERATORS: ReadonlySet<string> = new Set(["&&", "||", "|&", ";;"]);

type Kind = "npm" | "mise" | "file";

interface Item {
  readonly id: string;
  readonly kind: Kind;
  // Where the script lives: a workspace for npm, a config root for mise, or
  // the file's folder.
  readonly place: string;
  readonly name: string;
  // Where to read the script, relative to the root, as path or path:line.
  readonly location: string;
}

interface Inventory {
  readonly root: string;
  readonly repoName: string;
  readonly items: Map<string, Item>;
  // Workspace folder, relative to the root ("" for the root), to script names.
  readonly npm: Map<string, ReadonlySet<string>>;
  // Full mise task names, such as //apps/web:dev.
  readonly mise: ReadonlySet<string>;
  // Folders that hold a mise config, relative to the root.
  readonly miseRoots: readonly string[];
  readonly files: Set<string>;
  readonly tracked: ReadonlySet<string>;
  readonly edges: Map<string, Set<string>>;
}

// What one command invoked: inventory item ids and the labels of scripts that
// are not defined now.
interface Hits {
  readonly items: Set<string>;
  readonly unknown: Set<string>;
}

// One pass over commands: where to look scripts up, and where to record them.
// With `register`, a tracked script file that a definition runs joins the
// inventory; thread commands only match what is already there.
interface Scan {
  readonly inventory: Inventory;
  readonly hits: Hits;
  readonly register: boolean;
}

type Token =
  | { readonly kind: "word"; readonly value: string }
  | { readonly kind: "op"; readonly value: string };

interface Segment {
  readonly words: readonly string[];
  // The operator that ended the segment, or "" at the end of the command.
  readonly end: string;
}

// The working folder, relative to the root, or null outside this repository.
type Cwd = string | null;

interface Thread {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly provider: string;
}

interface Usage {
  readonly directThreads: Set<string>;
  readonly anyThreads: Set<string>;
  commands: number;
}

interface Report {
  readonly threads: readonly Thread[];
  readonly commands: number;
  readonly usage: Map<string, Usage>;
  readonly unknown: Map<string, Set<string>>;
}

interface Trace {
  readonly text: string;
  readonly thread: Thread;
  readonly command: string;
  readonly hits: Hits;
}

const HELP = `Usage: node scripts/script-usage.mts [N] [options]

Lists the npm scripts, mise tasks and scripts/ files of this repository that
the last N T3 Code threads for the project ran, and those they did not run.
Each entry gives where the script is defined, as path:line, and the newest
thread that ran it.

Arguments:
  N             How many of the newest threads to read; ${DEFAULT_THREADS} by default

Options:
  --json        Print the report as JSON
  --trace TEXT  Print to stderr each command that ran a script whose label
                contains TEXT, such as "test:e2e", with its thread
  --db PATH     T3 Code's state database; ${DEFAULT_DB} by default
  -h, --help    Show this help
`;

const MISE_BUILTINS: ReadonlySet<string> = new Set([
  "activate",
  "alias",
  "backends",
  "bin-paths",
  "cache",
  "completion",
  "config",
  "deactivate",
  "doctor",
  "edit",
  "en",
  "env",
  "exec",
  "fmt",
  "generate",
  "i",
  "implode",
  "install",
  "install-into",
  "latest",
  "link",
  "list",
  "lock",
  "ls",
  "ls-remote",
  "mcp",
  "outdated",
  "p",
  "plugins",
  "prune",
  "registry",
  "reshim",
  "search",
  "self-update",
  "set",
  "settings",
  "sh",
  "shell",
  "sync",
  "t",
  "tasks",
  "test-tool",
  "tool",
  "trust",
  "u",
  "uninstall",
  "unset",
  "unuse",
  "up",
  "upgrade",
  "usage",
  "use",
  "v",
  "version",
  "w",
  "watch",
  "where",
  "which",
  "x",
]);
const MISE_RUN: ReadonlySet<string> = new Set(["run", "r"]);
const MISE_FLAGS_WITH_VALUE: ReadonlySet<string> = new Set([
  "-C",
  "--cd",
  "-E",
  "--env",
  "-j",
  "--jobs",
  "--output",
  "-o",
]);
const NPM_RUN: ReadonlySet<string> = new Set([
  "run",
  "run-script",
  "rum",
  "urn",
]);
const NPM_TEST: ReadonlySet<string> = new Set(["test", "t", "tst"]);
const NPM_LIFECYCLE: ReadonlySet<string> = new Set([
  "start",
  "stop",
  "restart",
]);
const NPM_FLAGS_WITH_VALUE: ReadonlySet<string> = new Set([
  "-w",
  "--workspace",
  "--prefix",
  "-C",
  "--loglevel",
]);
const WRAPPERS: ReadonlySet<string> = new Set([
  "command",
  "exec",
  "nohup",
  "sudo",
  "time",
  "nice",
]);
const INTERPRETERS: ReadonlySet<string> = new Set([
  ".",
  "bash",
  "bun",
  "deno",
  "node",
  "python",
  "python3",
  "sh",
  "source",
  "ts-node",
  "tsx",
  "vite-node",
  "zsh",
]);
const INTERPRETER_FLAGS_WITH_VALUE: ReadonlySet<string> = new Set([
  "-r",
  "--require",
  "--import",
  "--loader",
  "--env-file",
  "-m",
]);
const SHELLS: ReadonlySet<string> = new Set(["bash", "sh", "zsh"]);
const KIND_ORDER: readonly Kind[] = ["npm", "mise", "file"];

function run(command: string, args: readonly string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Reads one field of a parsed record. A computed key keeps both TypeScript's
// noPropertyAccessFromIndexSignature and Biome's useLiteralKeys satisfied.
function field(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function stringRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === "string") {
        result[key] = entry;
      }
    }
  }
  return result;
}

function stringOr(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

function stringsOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

function indexOrEnd(source: string, found: number): number {
  if (found === -1) {
    return source.length;
  }
  return found;
}

// The place as the report shows it: "." for the root.
function shownPlace(place: string): string {
  return place || ".";
}

// The 1-based number of the first line of `file` that `matches`, as
// "path:line", or the bare path when no line matches.
function locate(
  root: string,
  file: string,
  matches: (line: string) => boolean,
): string {
  const relative = path.relative(root, path.resolve(root, file));
  if (!existsSync(path.resolve(root, file))) {
    return relative;
  }
  const lines = readFileSync(path.resolve(root, file), "utf8").split("\n");
  const index = lines.findIndex(matches);
  if (index === -1) {
    return relative;
  }
  return `${relative}:${index + 1}`;
}

// ---- Shell parsing --------------------------------------------------------

// Splits a shell command into words and operators. It honours quotes,
// escapes, comments and heredocs, and drops heredoc bodies so that text such
// as a commit message is not read as commands.
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const heredocs: { delimiter: string; strip: boolean }[] = [];
  let pendingHeredoc: boolean | null = null;
  let word = "";
  let inWord = false;
  let index = 0;

  function flush(): void {
    if (!inWord) {
      return;
    }
    if (pendingHeredoc === null) {
      tokens.push({ kind: "word", value: word });
    } else {
      heredocs.push({ delimiter: word, strip: pendingHeredoc });
      pendingHeredoc = null;
    }
    word = "";
    inWord = false;
  }

  function skipHeredocBodies(): void {
    for (const heredoc of heredocs) {
      let open = true;
      while (open && index < source.length) {
        const lineEnd = indexOrEnd(source, source.indexOf("\n", index));
        let line = source.slice(index, lineEnd);
        index = lineEnd + 1;
        if (heredoc.strip) {
          line = line.replace(LEADING_TABS, "");
        }
        open = line !== heredoc.delimiter;
      }
    }
    heredocs.length = 0;
  }

  function readRedirect(char: string): void {
    if (inWord && FD_ONLY.test(word)) {
      word = "";
      inWord = false;
    } else {
      flush();
    }
    const operator = REDIRECT.exec(source.slice(index))?.[0] ?? char;
    index += operator.length;
    if (operator === "<<" || operator === "<<-") {
      pendingHeredoc = operator === "<<-";
      return;
    }
    if (operator.endsWith("&")) {
      const target = DUPLICATE_TARGET.exec(source.slice(index));
      if (target !== null) {
        index += target[0].length;
        return;
      }
    }
    tokens.push({ kind: "op", value: "redirect" });
  }

  function readDoubleQuoted(): void {
    inWord = true;
    index += 1;
    while (index < source.length && source.charAt(index) !== '"') {
      const escaped = source.charAt(index + 1);
      if (source.charAt(index) === "\\" && '"\\$`\n'.includes(escaped)) {
        word += escaped;
        index += 2;
      } else {
        word += source.charAt(index);
        index += 1;
      }
    }
    index += 1;
  }

  function readOperator(char: string, next: string): void {
    flush();
    let operator = char;
    if (PAIRED_OPERATORS.has(char + next)) {
      operator = char + next;
    }
    index += operator.length;
    if (operator === "`") {
      operator = ";";
    }
    tokens.push({ kind: "op", value: operator });
  }

  while (index < source.length) {
    const char = source.charAt(index);
    const next = source.charAt(index + 1);
    if (char === "'") {
      const end = indexOrEnd(source, source.indexOf("'", index + 1));
      word += source.slice(index + 1, end);
      inWord = true;
      index = end + 1;
    } else if (char === '"') {
      readDoubleQuoted();
    } else if (char === "\\") {
      if (next !== "\n") {
        word += next;
        inWord = true;
      }
      index += 2;
    } else if (char === "#" && !inWord) {
      index = indexOrEnd(source, source.indexOf("\n", index));
    } else if (char === "\n") {
      flush();
      tokens.push({ kind: "op", value: ";" });
      index += 1;
      skipHeredocBodies();
    } else if (char === " " || char === "\t" || char === "\r") {
      flush();
      index += 1;
    } else if (char === "<" || char === ">") {
      readRedirect(char);
    } else if (char === "&" && next === ">") {
      flush();
      index += AMPERSAND_REDIRECT.exec(source.slice(index))?.[0].length ?? 2;
      tokens.push({ kind: "op", value: "redirect" });
    } else if (char === "$" && next === "(") {
      flush();
      tokens.push({ kind: "op", value: "(" });
      index += 2;
    } else if ("&|;()`".includes(char)) {
      readOperator(char, next);
    } else {
      word += char;
      inWord = true;
      index += 1;
    }
  }
  flush();
  return tokens;
}

function segmentsOf(source: string): Segment[] {
  const segments: Segment[] = [];
  let words: string[] = [];
  let skipNext = false;
  for (const token of tokenize(source)) {
    if (token.kind === "word") {
      if (skipNext) {
        skipNext = false;
      } else {
        words.push(token.value);
      }
    } else if (token.value === "redirect") {
      skipNext = true;
    } else {
      segments.push({ words, end: token.value });
      words = [];
    }
  }
  segments.push({ words, end: "" });
  return segments;
}

// Drops leading variable assignments and wrapper commands such as `env`,
// `time` and `timeout 600`.
function stripWrappers(words: readonly string[]): string[] {
  const rest = [...words];
  for (;;) {
    const [head] = rest;
    if (head === undefined) {
      return rest;
    }
    if (ASSIGNMENT.test(head) || WRAPPERS.has(head)) {
      rest.shift();
    } else if (head === "env") {
      rest.shift();
      while (rest[0]?.startsWith("-") === true) {
        const flag = rest.shift();
        if (flag === "-u") {
          rest.shift();
        }
      }
    } else if (head === "timeout") {
      rest.shift();
      while (rest[0]?.startsWith("-") === true) {
        rest.shift();
      }
      rest.shift();
    } else {
      return rest;
    }
  }
}

// ---- Path resolution -------------------------------------------------------

function expandHome(word: string): string {
  if (word === "~" || word === "$HOME") {
    return homedir();
  }
  for (const prefix of ["~/", "$HOME/"]) {
    if (word.startsWith(prefix)) {
      return path.join(homedir(), word.slice(prefix.length));
    }
  }
  return word;
}

// Maps an absolute path in this repository, or in any worktree of it, to a
// path relative to the root. Returns null for paths outside it.
function repoRelative(absolute: string, inventory: Inventory): Cwd {
  const normalized = path.posix.normalize(absolute);
  if (normalized === inventory.root) {
    return "";
  }
  if (normalized.startsWith(`${inventory.root}/`)) {
    return normalized.slice(inventory.root.length + 1);
  }
  const parts = normalized.split("/");
  const worktrees = parts.lastIndexOf("worktrees");
  if (worktrees !== -1 && parts[worktrees + 1] === inventory.repoName) {
    return parts.slice(worktrees + WORKTREE_PATH_PARTS).join("/");
  }
  const name = parts.lastIndexOf(inventory.repoName);
  if (name === -1) {
    return null;
  }
  return parts.slice(name + 1).join("/");
}

function changeDirectory(cwd: Cwd, target: string, inventory: Inventory): Cwd {
  const expanded = expandHome(target);
  // A folder held in a variable, such as a temporary one, is unknown, so
  // treat it as outside the repository.
  if (expanded.includes("$")) {
    return null;
  }
  if (path.posix.isAbsolute(expanded)) {
    return repoRelative(expanded, inventory);
  }
  if (cwd === null || target === "-") {
    return null;
  }
  const joined = path.posix.normalize(path.posix.join(cwd, expanded));
  if (joined === ".") {
    return "";
  }
  if (joined.startsWith("..")) {
    return null;
  }
  return joined;
}

// The innermost of `places` that holds `cwd`.
function placeOf(cwd: string, places: Iterable<string>): string {
  let best = "";
  for (const place of places) {
    const holds = place === "" || cwd === place || cwd.startsWith(`${place}/`);
    if (holds && place.length > best.length) {
      best = place;
    }
  }
  return best;
}

function isKnownFile(candidate: Cwd, scan: Scan): boolean {
  if (candidate === null) {
    return false;
  }
  if (scan.inventory.files.has(candidate)) {
    return true;
  }
  if (
    scan.register &&
    scan.inventory.tracked.has(candidate) &&
    SCRIPT_EXTENSION.test(candidate)
  ) {
    addFile(scan.inventory, candidate);
    return true;
  }
  return false;
}

// Finds the inventory file a word names, if any.
function resolveFile(word: string, cwd: Cwd, scan: Scan): string | null {
  const expanded = expandHome(word);
  if (path.posix.isAbsolute(expanded)) {
    const relative = repoRelative(expanded, scan.inventory);
    if (isKnownFile(relative, scan)) {
      return relative;
    }
    return null;
  }
  if (cwd !== null) {
    const joined = path.posix.normalize(path.posix.join(cwd, expanded));
    if (isKnownFile(joined, scan)) {
      return joined;
    }
  }
  // The working folder may be wrong, so take a path of two or more parts
  // that ends exactly one inventory file.
  const tail = expanded.replace(LEADING_DOTS, "");
  if (!tail.includes("/")) {
    return null;
  }
  const matches = [...scan.inventory.files].filter(
    (file: string): boolean => file === tail || file.endsWith(`/${tail}`),
  );
  if (matches.length !== 1) {
    return null;
  }
  return matches[0] ?? null;
}

// ---- Invocation matching ----------------------------------------------------

const packageNameCache = new Map<string, string>();

function packageNames(inventory: Inventory): Map<string, string> {
  if (packageNameCache.size === 0) {
    for (const place of inventory.npm.keys()) {
      const manifest = readJson(
        path.join(inventory.root, place, "package.json"),
      );
      if (isRecord(manifest)) {
        const name = field(manifest, "name");
        if (typeof name === "string") {
          packageNameCache.set(place, name);
        }
      }
    }
  }
  return packageNameCache;
}

function workspaceNamed(name: string, cwd: Cwd, inventory: Inventory): Cwd {
  const trimmed = name.replace(LEADING_DOTS, "").replace(TRAILING_SLASH, "");
  if (inventory.npm.has(trimmed)) {
    return trimmed;
  }
  for (const place of inventory.npm.keys()) {
    if (place !== "" && path.posix.basename(place) === trimmed) {
      return place;
    }
  }
  for (const [place, packageName] of packageNames(inventory)) {
    if (packageName === name) {
      return place;
    }
  }
  return changeDirectory(cwd, name, inventory);
}

// The working folder is a guess: T3 Code does not record the folder Codex
// runs a command in. So a script the guessed workspace lacks counts for every
// workspace that defines it.
function addNpmHit(script: string, place: string, scan: Scan): void {
  if (scan.inventory.npm.get(place)?.has(script) === true) {
    scan.hits.items.add(`npm:${place}:${script}`);
    return;
  }
  let found = false;
  for (const [other, scripts] of scan.inventory.npm) {
    if (scripts.has(script)) {
      scan.hits.items.add(`npm:${other}:${script}`);
      found = true;
    }
  }
  if (!found) {
    scan.hits.unknown.add(`npm run ${script}`);
  }
}

function npmScriptName(positional: readonly string[]): string | undefined {
  const [command = "", script] = positional;
  if (NPM_RUN.has(command)) {
    return script;
  }
  if (NPM_TEST.has(command)) {
    return "test";
  }
  if (NPM_LIFECYCLE.has(command)) {
    return command;
  }
  return undefined;
}

function matchNpm(args: readonly string[], cwd: Cwd, scan: Scan): void {
  const targets: string[] = [];
  const positional: string[] = [];
  let allWorkspaces = false;
  let prefix: Cwd = cwd;
  let index = 0;
  while (index < args.length && args[index] !== "--") {
    const arg = args[index] ?? "";
    const [flag = "", inline] = arg.split("=", 2);
    index += 1;
    if (flag === "--workspaces" || flag === "-ws") {
      allWorkspaces = true;
    } else if (NPM_FLAGS_WITH_VALUE.has(flag)) {
      let value = inline;
      if (value === undefined) {
        value = args[index] ?? "";
        index += 1;
      }
      if (flag === "-w" || flag === "--workspace") {
        const place = workspaceNamed(value, cwd, scan.inventory);
        if (place !== null) {
          targets.push(place);
        }
      } else if (flag === "--prefix" || flag === "-C") {
        prefix = changeDirectory(cwd, value, scan.inventory);
      }
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }
  const name = npmScriptName(positional);
  if (name === undefined || prefix === null) {
    return;
  }
  if (allWorkspaces) {
    for (const [place, scripts] of scan.inventory.npm) {
      if (place !== "" && scripts.has(name)) {
        scan.hits.items.add(`npm:${place}:${name}`);
      }
    }
    return;
  }
  if (targets.length === 0) {
    targets.push(placeOf(prefix, scan.inventory.npm.keys()));
  }
  for (const place of targets) {
    addNpmHit(name, place, scan);
  }
}

function addMiseHit(task: string, cwd: string, scan: Scan): void {
  const { inventory, hits } = scan;
  const local = placeOf(cwd, inventory.miseRoots);
  let candidates = [`//${local}:${task}`, `//:${task}`];
  if (task.startsWith("//")) {
    candidates = [task];
  } else if (task.startsWith(":")) {
    candidates = [`//${local}${task}`];
  }
  const found = candidates.find((name: string): boolean =>
    inventory.mise.has(name),
  );
  if (found !== undefined) {
    hits.items.add(`mise:${found}`);
    return;
  }
  // As for npm, the folder is a guess, so fall back to any config root's task
  // of that name. A full //path:task name is not a guess.
  if (task.startsWith("//")) {
    hits.unknown.add(`mise ${task}`);
    return;
  }
  const suffix = `:${task.replace(LEADING_COLON, "")}`;
  const others = [...inventory.mise].filter((name: string): boolean =>
    name.endsWith(suffix),
  );
  for (const name of others) {
    hits.items.add(`mise:${name}`);
  }
  if (others.length === 0) {
    hits.unknown.add(`mise ${task}`);
  }
}

function matchMise(args: readonly string[], cwd: Cwd, scan: Scan): void {
  let here = cwd;
  const rest: string[] = [];
  let index = 0;
  while (index < args.length) {
    const arg = args[index] ?? "";
    index += 1;
    if (MISE_FLAGS_WITH_VALUE.has(arg)) {
      if (arg === "-C" || arg === "--cd") {
        here = changeDirectory(cwd, args[index] ?? "", scan.inventory);
      }
      index += 1;
    } else if (rest.length > 0 || !arg.startsWith("-")) {
      rest.push(arg);
    }
  }
  const [command, ...after] = rest;
  if (here === null || command === undefined) {
    return;
  }
  let words = rest;
  if (MISE_RUN.has(command)) {
    words = after;
  } else if (MISE_BUILTINS.has(command)) {
    return;
  }
  let expectTask = true;
  for (const word of words) {
    if (word === "--") {
      return;
    }
    if (word === ":::") {
      expectTask = true;
    } else if (expectTask && !word.startsWith("-")) {
      addMiseHit(word, here, scan);
      expectTask = false;
    }
  }
}

// Matches the script an interpreter runs: its first argument that is not a
// flag. Later arguments, such as `--config vitest.config.mts`, are data.
function matchScriptArgument(
  args: readonly string[],
  cwd: Cwd,
  scan: Scan,
): void {
  let index = 0;
  while (index < args.length) {
    const arg = args[index] ?? "";
    index += 1;
    if (INTERPRETER_FLAGS_WITH_VALUE.has(arg)) {
      index += 1;
    } else if (!arg.startsWith("-")) {
      const file = resolveFile(arg, cwd, scan);
      if (file !== null) {
        scan.hits.items.add(`file:${file}`);
      }
      return;
    }
  }
}

// Reads one simple command. Returns the new working folder for `cd`.
function matchSegment(words: readonly string[], cwd: Cwd, scan: Scan): Cwd {
  const [head, ...args] = stripWrappers(words);
  if (head === undefined) {
    return cwd;
  }
  const program = path.posix.basename(head);
  const [flag, script = ""] = args;
  if (program === "cd" || program === "pushd") {
    return changeDirectory(cwd, flag ?? "~", scan.inventory);
  }
  if (
    SHELLS.has(program) &&
    flag !== undefined &&
    SHELL_WITH_COMMAND.test(flag)
  ) {
    analyzeCommand(script, cwd, scan);
  } else if (program === "npm") {
    matchNpm(args, cwd, scan);
  } else if (program === "mise") {
    matchMise(args, cwd, scan);
  } else if (program === "npx") {
    const tool = args.findIndex((arg: string): boolean => !arg.startsWith("-"));
    if (tool !== -1 && INTERPRETERS.has(args[tool] ?? "")) {
      matchScriptArgument(args.slice(tool + 1), cwd, scan);
    }
  } else if (INTERPRETERS.has(program)) {
    matchScriptArgument(args, cwd, scan);
  } else {
    matchScriptArgument([head], cwd, scan);
  }
  return cwd;
}

// Reads a whole shell command and returns the working folder it leaves.
function analyzeCommand(source: string, start: Cwd, scan: Scan): Cwd {
  const stack: Cwd[] = [];
  let cwd = start;
  for (const segment of segmentsOf(source)) {
    cwd = matchSegment(segment.words, cwd, scan);
    if (segment.end === "(") {
      stack.push(cwd);
    } else if (segment.end === ")" && stack.length > 0) {
      const outer = stack.pop();
      if (outer !== undefined) {
        cwd = outer;
      }
    }
  }
  const [outermost] = stack;
  if (stack.length > 0) {
    return outermost ?? null;
  }
  return cwd;
}

function emptyHits(): Hits {
  return { items: new Set(), unknown: new Set() };
}

// ---- Inventory ----------------------------------------------------------------

function addFile(inventory: Inventory, file: string): void {
  inventory.files.add(file);
  inventory.items.set(`file:${file}`, {
    id: `file:${file}`,
    kind: "file",
    place: path.posix.dirname(file),
    name: path.posix.basename(file),
    location: file,
  });
}

function addEdges(inventory: Inventory, from: string, hits: Hits): void {
  const edges = inventory.edges.get(from) ?? new Set<string>();
  for (const id of hits.items) {
    if (id !== from) {
      edges.add(id);
    }
  }
  inventory.edges.set(from, edges);
}

function workspaceFolders(root: string): string[] {
  const manifest = readJson(path.join(root, "package.json"));
  let patterns: string[] = [];
  if (isRecord(manifest)) {
    patterns = stringsOf(field(manifest, "workspaces"));
  }
  const folders = [""];
  for (const pattern of patterns) {
    if (pattern.endsWith("/*")) {
      const parent = pattern.slice(0, -2);
      for (const entry of readdirSync(path.join(root, parent))) {
        folders.push(path.posix.join(parent, entry));
      }
    } else {
      folders.push(pattern);
    }
  }
  return folders.filter((folder: string): boolean =>
    existsSync(path.join(root, folder, "package.json")),
  );
}

interface MiseTask {
  readonly name: string;
  readonly dir: string;
  readonly source: string;
  readonly run: readonly string[];
}

function miseTasks(root: string): MiseTask[] {
  let output = "[]";
  try {
    output = run("mise", ["tasks", "ls", "--all", "--json"], root);
  } catch {
    process.stderr.write("mise is unavailable, so mise tasks are left out.\n");
  }
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isRecord).map(
    (task: Record<string, unknown>): MiseTask => ({
      name: String(field(task, "name")),
      dir: stringOr(field(task, "dir"), root),
      source: stringOr(field(task, "source"), path.join(root, "mise.toml")),
      run: stringsOf(field(task, "run")),
    }),
  );
}

function isScriptFile(file: string): boolean {
  return (
    file.split("/").includes("scripts") &&
    SCRIPT_EXTENSION.test(file) &&
    !file.endsWith(".d.ts") &&
    !TEST_FOLDER.test(file) &&
    !TEST_FILE.test(file)
  );
}

// Links each script file to the inventory files it imports or sources.
function addFileEdges(inventory: Inventory): void {
  for (const file of [...inventory.files]) {
    const absolute = path.join(inventory.root, file);
    if (existsSync(absolute)) {
      const text = readFileSync(absolute, "utf8");
      const folder = path.posix.dirname(file);
      const hits = emptyHits();
      for (const match of text.matchAll(RELATIVE_IMPORT)) {
        const specifier = stringOr(field(match.groups ?? {}, "specifier"), "");
        const target = path.posix.normalize(path.posix.join(folder, specifier));
        if (inventory.files.has(target)) {
          hits.items.add(`file:${target}`);
        }
      }
      if (file.endsWith(".sh") || file.endsWith(".bash")) {
        const words = new Set(text.split(SHELL_WORD_BREAK));
        for (const other of inventory.files) {
          const sameFolder = path.posix.dirname(other) === folder;
          if (sameFolder && words.has(path.posix.basename(other))) {
            hits.items.add(`file:${other}`);
          }
        }
      }
      addEdges(inventory, `file:${file}`, hits);
    }
  }
}

// The main checkout, which T3 Code records as the project's workspace root
// even when this script runs from a worktree.
function mainRoot(root: string): string {
  const common = run(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    root,
  ).trim();
  return path.dirname(common);
}

function addNpmScripts(inventory: Inventory): [string, string, string][] {
  const definitions: [string, string, string][] = [];
  for (const folder of workspaceFolders(inventory.root)) {
    const manifestPath = path.join(folder, "package.json");
    const manifest = readJson(path.join(inventory.root, manifestPath));
    let scripts: Record<string, string> = {};
    if (isRecord(manifest)) {
      scripts = stringRecord(field(manifest, "scripts"));
    }
    inventory.npm.set(folder, new Set(Object.keys(scripts)));
    for (const [name, command] of Object.entries(scripts)) {
      definitions.push([folder, name, command]);
      const key = `"${name}":`;
      inventory.items.set(`npm:${folder}:${name}`, {
        id: `npm:${folder}:${name}`,
        kind: "npm",
        place: shownPlace(folder),
        name,
        location: locate(inventory.root, manifestPath, (line: string) =>
          line.trimStart().startsWith(key),
        ),
      });
    }
  }
  return definitions;
}

function addMiseTasks(inventory: Inventory, tasks: readonly MiseTask[]): void {
  for (const task of tasks) {
    const name = task.name.slice(task.name.indexOf(":") + 1);
    const headers = [`[tasks.${name}]`, `[tasks."${name}"]`];
    inventory.items.set(`mise:${task.name}`, {
      id: `mise:${task.name}`,
      kind: "mise",
      place: shownPlace(path.relative(inventory.root, task.dir)),
      name,
      location: locate(inventory.root, task.source, (line: string) =>
        headers.includes(line.trim()),
      ),
    });
  }
}

function buildInventory(root: string): Inventory {
  const tracked = new Set(
    run(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      root,
    ).split("\n"),
  );
  const tasks = miseTasks(root);
  const inventory: Inventory = {
    root,
    repoName: path.basename(mainRoot(root)),
    items: new Map(),
    npm: new Map(),
    mise: new Set(tasks.map((task: MiseTask): string => task.name)),
    miseRoots: [
      ...new Set(
        tasks.map((task: MiseTask): string => path.relative(root, task.dir)),
      ),
    ],
    files: new Set(),
    tracked,
    edges: new Map(),
  };
  for (const file of tracked) {
    if (isScriptFile(file)) {
      addFile(inventory, file);
    }
  }
  const npmDefinitions = addNpmScripts(inventory);
  addMiseTasks(inventory, tasks);
  for (const [folder, name, command] of npmDefinitions) {
    const scan: Scan = { inventory, hits: emptyHits(), register: true };
    analyzeCommand(command, folder, scan);
    addEdges(inventory, `npm:${folder}:${name}`, scan.hits);
  }
  for (const task of tasks) {
    const scan: Scan = { inventory, hits: emptyHits(), register: true };
    for (const line of task.run) {
      const command = line.replaceAll("{{config_root}}", root);
      analyzeCommand(command, path.relative(root, task.dir), scan);
    }
    addEdges(inventory, `mise:${task.name}`, scan.hits);
  }
  addFileEdges(inventory);
  return inventory;
}

// ---- Threads ------------------------------------------------------------------

function readThreads(
  database: DatabaseSync,
  workspaceRoot: string,
  count: number,
): Thread[] {
  const project = database
    .prepare(
      "SELECT project_id FROM projection_projects WHERE workspace_root = ? AND deleted_at IS NULL",
    )
    .get(workspaceRoot);
  if (project === undefined) {
    throw new Error(`T3 Code has no project for ${workspaceRoot}.`);
  }
  return database
    .prepare(
      `SELECT thread_id, title, created_at, default_provider
       FROM orchestration_v2_projection_threads
       WHERE project_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(String(field(project, "project_id")), count)
    .map(
      (row: Record<string, unknown>): Thread => ({
        id: String(field(row, "thread_id")),
        title: String(field(row, "title")),
        createdAt: String(field(row, "created_at")),
        provider: String(field(row, "default_provider")),
      }),
    );
}

function readCommands(database: DatabaseSync, threadId: string): string[] {
  return database
    .prepare(
      `SELECT json_extract(payload_json, '$.input') AS input
       FROM orchestration_v2_projection_turn_items
       WHERE thread_id = ? AND type = 'command_execution'
       ORDER BY ordinal`,
    )
    .all(threadId)
    .map((row: Record<string, unknown>): unknown => field(row, "input"))
    .filter((input: unknown): input is string => typeof input === "string");
}

function closure(
  direct: ReadonlySet<string>,
  inventory: Inventory,
): Set<string> {
  const reached = new Set(direct);
  const queue = [...direct];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const next of inventory.edges.get(id) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return reached;
}

function itemLabel(item: Item): string {
  if (item.kind === "file") {
    return `${item.place}/${item.name}`;
  }
  return `${item.place}  ${item.name}`;
}

function traceCommand(trace: Trace, inventory: Inventory): void {
  const labels = [
    ...[...trace.hits.items].map((id: string): string => {
      const item = inventory.items.get(id);
      if (item === undefined) {
        return id;
      }
      return `${item.kind} ${itemLabel(item)}`;
    }),
    ...trace.hits.unknown,
  ].filter((text: string): boolean => text.includes(trace.text));
  if (labels.length === 0) {
    return;
  }
  let shown = trace.command;
  if (shown.length > TRACE_LENGTH) {
    shown = `${shown.slice(0, TRACE_LENGTH)}…`;
  }
  const { thread } = trace;
  process.stderr.write(
    `[${labels.join(", ")}] ${thread.createdAt.slice(0, 10)} ${thread.title} (${thread.id})\n  ${shown.replaceAll("\n", "\n  ")}\n`,
  );
}

function buildReport(
  inventory: Inventory,
  database: DatabaseSync,
  threads: readonly Thread[],
  traceText: string | undefined,
): Report {
  const usage = new Map<string, Usage>();
  for (const id of inventory.items.keys()) {
    usage.set(id, {
      directThreads: new Set(),
      anyThreads: new Set(),
      commands: 0,
    });
  }
  const unknown = new Map<string, Set<string>>();
  let commandCount = 0;
  for (const thread of threads) {
    const direct = new Set<string>();
    // Claude Code keeps a `cd` for later commands while it stays inside the
    // repository. Codex starts each command in the thread's folder.
    const keepsFolder = thread.provider === "claudeAgent";
    let cwd: Cwd = "";
    for (const command of readCommands(database, thread.id)) {
      commandCount += 1;
      const scan: Scan = { inventory, hits: emptyHits(), register: false };
      const after = analyzeCommand(command, cwd, scan);
      cwd = "";
      if (keepsFolder && after !== null) {
        cwd = after;
      }
      if (traceText !== undefined) {
        traceCommand(
          { text: traceText, thread, command, hits: scan.hits },
          inventory,
        );
      }
      for (const id of scan.hits.items) {
        direct.add(id);
        const entry = usage.get(id);
        if (entry !== undefined) {
          entry.commands += 1;
          entry.directThreads.add(thread.id);
        }
      }
      for (const name of scan.hits.unknown) {
        const seen = unknown.get(name) ?? new Set<string>();
        seen.add(thread.id);
        unknown.set(name, seen);
      }
    }
    for (const id of closure(direct, inventory)) {
      usage.get(id)?.anyThreads.add(thread.id);
    }
  }
  return { threads, commands: commandCount, usage, unknown };
}

// ---- Output -------------------------------------------------------------------

function compareItems(left: Item, right: Item): number {
  return (
    KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind) ||
    left.place.localeCompare(right.place) ||
    left.name.localeCompare(right.name)
  );
}

function usageOf(report: Report, item: Item): Usage {
  return (
    report.usage.get(item.id) ?? {
      directThreads: new Set(),
      anyThreads: new Set(),
      commands: 0,
    }
  );
}

// The newest of the given threads, which come newest first in the report.
function newestThread(
  report: Report,
  ids: ReadonlySet<string>,
): Thread | undefined {
  return report.threads.find((thread: Thread): boolean => ids.has(thread.id));
}

function threadNote(thread: Thread | undefined): string {
  if (thread === undefined) {
    return "";
  }
  return `${thread.createdAt.slice(0, 10)} ${thread.title} (${thread.id})`;
}

function table(rows: readonly (readonly string[])[]): string {
  const widths: number[] = [];
  for (const row of rows) {
    for (const [column, cell] of row.entries()) {
      widths[column] = Math.max(widths[column] ?? 0, cell.length);
    }
  }
  return rows
    .map((row: readonly string[]): string => {
      const cells = row.map((cell: string, column: number): string =>
        cell.padEnd(widths[column] ?? 0),
      );
      return `  ${cells.join("  ")}`.trimEnd();
    })
    .join("\n");
}

// The script column of the text report. A file's path is in "defined at".
function shownName(item: Item): string {
  if (item.kind === "file") {
    return item.name;
  }
  return itemLabel(item);
}

function runRows(report: Report, items: readonly Item[]): string[][] {
  const rows = [
    ["kind", "script", "direct", "any", "commands", "defined at", "newest run"],
  ];
  for (const item of items) {
    const entry = usageOf(report, item);
    let newest = newestThread(report, entry.directThreads);
    newest ??= newestThread(report, entry.anyThreads);
    rows.push([
      item.kind,
      shownName(item),
      String(entry.directThreads.size),
      String(entry.anyThreads.size),
      String(entry.commands),
      item.location,
      threadNote(newest),
    ]);
  }
  return rows;
}

function printText(report: Report, inventory: Inventory): void {
  const items = [...inventory.items.values()].sort(compareItems);
  const dates = report.threads.map((thread: Thread): string =>
    thread.createdAt.slice(0, 10),
  );
  const used = items
    .filter((item: Item): boolean => usageOf(report, item).anyThreads.size > 0)
    .sort((left: Item, right: Item): number => {
      const a = usageOf(report, left);
      const b = usageOf(report, right);
      return (
        b.anyThreads.size - a.anyThreads.size ||
        b.directThreads.size - a.directThreads.size ||
        compareItems(left, right)
      );
    });
  const unused = items.filter(
    (item: Item): boolean => usageOf(report, item).anyThreads.size === 0,
  );
  const lines: string[] = [
    `${inventory.repoName}: last ${report.threads.length} threads, ${dates.at(-1) ?? "-"} to ${dates[0] ?? "-"}, ${report.commands} shell commands`,
    "Paths are relative to the repository root. Rerun with --trace NAME to see the commands behind an entry.",
    "",
    `Run (${used.length}): "direct" and "any" count threads that ran it directly or at all`,
    table(runRows(report, used)),
    "",
    `Not run (${unused.length})`,
    table([
      ["kind", "script", "defined at"],
      ...unused.map((item: Item): string[] => [
        item.kind,
        shownName(item),
        item.location,
      ]),
    ]),
  ];
  if (report.unknown.size > 0) {
    const unknown = [...report.unknown].sort(
      (left: [string, Set<string>], right: [string, Set<string>]): number =>
        right[1].size - left[1].size || left[0].localeCompare(right[0]),
    );
    lines.push(
      "",
      `Run but not defined now (${unknown.length})`,
      table([
        ["command", "threads", "newest run"],
        ...unknown.map(([name, seen]: [string, Set<string>]): string[] => [
          name,
          String(seen.size),
          threadNote(newestThread(report, seen)),
        ]),
      ]),
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printJson(report: Report, inventory: Inventory): void {
  const items = [...inventory.items.values()]
    .sort(compareItems)
    .map((item: Item): Record<string, unknown> => {
      const entry = usageOf(report, item);
      return {
        kind: item.kind,
        place: item.place,
        name: item.name,
        location: item.location,
        commands: entry.commands,
        directThreads: [...entry.directThreads],
        anyThreads: [...entry.anyThreads],
      };
    });
  const unknown = Object.fromEntries(
    [...report.unknown].map(([name, seen]: [string, Set<string>]) => [
      name,
      [...seen],
    ]),
  );
  const result = {
    root: inventory.root,
    threads: report.threads,
    commands: report.commands,
    items,
    unknown,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      db: { type: "string", default: DEFAULT_DB },
      trace: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    process.stdout.write(HELP);
    return;
  }
  const [countText = String(DEFAULT_THREADS)] = positionals;
  const count = Number(countText);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`N must be a whole number above 0, not "${countText}".`);
  }
  if (!existsSync(values.db)) {
    throw new Error(`No T3 Code database at ${values.db}.`);
  }
  const root = run(
    "git",
    ["rev-parse", "--show-toplevel"],
    import.meta.dirname,
  ).trim();
  const inventory = buildInventory(root);
  const database = new DatabaseSync(values.db, { readOnly: true });
  try {
    const threads = readThreads(database, mainRoot(root), count);
    const report = buildReport(inventory, database, threads, values.trace);
    if (values.json) {
      printJson(report, inventory);
    } else {
      printText(report, inventory);
    }
  } finally {
    database.close();
  }
}

main();
