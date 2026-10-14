// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { EmailMessage } from "@/email/email-message.ts";
import { writeToOutbox } from "@/email/outbox.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The file system, as calls logged in order: the outbox's writes are checked
// without touching the disk (and without this test using Node's modules,
// which biome.jsonc keeps to outbox.ts itself).
type FileCall =
  | { readonly name: "mkdir"; readonly path: string; readonly options: unknown }
  | { readonly name: "writeFile"; readonly path: string; readonly data: string }
  | { readonly name: "rename"; readonly from: string; readonly to: string };

const fs = vi.hoisted(() => {
  const calls: FileCall[] = [];
  return {
    calls,
    mkdir: vi.fn((path: string, options: unknown) => {
      calls.push({ name: "mkdir", path, options });
      return Promise.resolve(undefined);
    }),
    writeFile: vi.fn((path: string, data: string) => {
      calls.push({ name: "writeFile", path, data });
      return Promise.resolve();
    }),
    rename: vi.fn((from: string, to: string) => {
      calls.push({ name: "rename", from, to });
      return Promise.resolve();
    }),
  };
});
vi.mock("node:fs/promises", () => ({
  mkdir: fs.mkdir,
  writeFile: fs.writeFile,
  rename: fs.rename,
}));

const DIRECTORY = "/outbox";
// The key's slash and colon aren't safe in a file name, so become dashes.
const FINAL_PATH = `${DIRECTORY}/login-abc-1.json`;
const TEMPORARY_PATH = /^\/outbox\/login-abc-1\.json\.[^/]+\.tmp$/u;
const MESSAGE: EmailMessage = {
  to: "mabel@example.test",
  subject: "Your sign-in link",
  text: "Sign in: https://site.example/login",
  html: '<a href="https://site.example/login">Sign in</a>',
  idempotencyKey: "login/abc:1",
};

function callsNamed<Name extends FileCall["name"]>(
  name: Name,
): Extract<FileCall, { name: Name }>[] {
  return fs.calls.filter(
    (call): call is Extract<FileCall, { name: Name }> => call.name === name,
  );
}

// sentAt, as an ISO 8601 time to the millisecond in UTC.
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

// The address EMAIL_FROM_ADDRESS names in these tests.
const FROM_ADDRESS = "sender@example.test";

beforeEach(() => {
  fs.calls.length = 0;
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_FROM_ADDRESS", FROM_ADDRESS);
});

afterEach(vi.unstubAllEnvs);

test("writes the whole email to a temporary file and renames it into place", async () => {
  const written = Promise.withResolvers<undefined>();
  fs.writeFile.mockImplementationOnce((path: string, data: string) => {
    fs.calls.push({ name: "writeFile", path, data });
    return written.promise;
  });

  const writing = writeToOutbox(MESSAGE, DIRECTORY);
  await vi.waitFor(() => {
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });
  // Until the temporary file is whole, nothing appears under the final name.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(fs.rename).not.toHaveBeenCalled();

  written.resolve(undefined);
  await writing;

  const [write] = callsNamed("writeFile");
  expect(write?.path).toMatch(TEMPORARY_PATH);
  expect(write?.path).not.toBe(FINAL_PATH);
  expect(fs.calls.map((call) => call.name)).toEqual([
    "mkdir",
    "writeFile",
    "rename",
  ]);
  expect(callsNamed("rename")).toEqual([
    { name: "rename", from: write?.path, to: FINAL_PATH },
  ]);
  // The final path is only ever made by the rename.
  expect(callsNamed("writeFile").map((call) => call.path)).not.toContain(
    FINAL_PATH,
  );

  // The written file is the whole email, sent now from the site's sender.
  expect(JSON.parse(write?.data ?? "")).toEqual({
    from: `${SITE_COPY.name} <${FROM_ADDRESS}>`,
    to: MESSAGE.to,
    subject: MESSAGE.subject,
    text: MESSAGE.text,
    html: MESSAGE.html,
    sentAt: expect.stringMatching(ISO_TIME),
  });
});

test("gives two concurrent writes under one key their own temporary files", async () => {
  await Promise.all([
    writeToOutbox(MESSAGE, DIRECTORY),
    writeToOutbox({ ...MESSAGE, subject: "Your second link" }, DIRECTORY),
  ]);

  const writes = callsNamed("writeFile");
  const renames = callsNamed("rename");
  expect(writes).toHaveLength(2);
  const [first, second] = writes;
  expect(first?.path).toMatch(TEMPORARY_PATH);
  expect(second?.path).toMatch(TEMPORARY_PATH);
  expect(first?.path).not.toBe(second?.path);
  // Each write renames its own file into the one final place.
  expect(renames).toEqual([
    { name: "rename", from: first?.path, to: FINAL_PATH },
    { name: "rename", from: second?.path, to: FINAL_PATH },
  ]);
  // So the last rename's email is the one the outbox keeps.
  const kept = writes.find((write) => write.path === renames.at(-1)?.from);
  expect(JSON.parse(kept?.data ?? "")).toMatchObject({
    subject: "Your second link",
  });
});

test("creates the outbox directory before writing", async () => {
  await writeToOutbox(MESSAGE, DIRECTORY);

  expect(fs.calls[0]).toEqual({
    name: "mkdir",
    path: DIRECTORY,
    options: { recursive: true },
  });
  expect(fs.calls.findIndex((call) => call.name === "writeFile")).toBe(1);
});
