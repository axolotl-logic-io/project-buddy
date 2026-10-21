// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { EmailMessage } from "@/email/email-message.ts";
import { writeToOutbox } from "@/email/outbox.ts";
import { EMAIL_SENDER_COPY } from "@/ui/copy/site.ts";
import {
  filesIn,
  holdNextWrite,
  readFakeFile,
  resetFakeDisk,
} from "./fake-outbox-fs.ts";

// The outbox's writes go to an in-memory disk, without this test using
// Node's modules, which biome.jsonc keeps to outbox.ts itself.
vi.mock("node:fs/promises", () => import("./fake-outbox-fs.ts"));

// A folder whose parent doesn't exist yet either.
const DIRECTORY = "/e2e/outbox";
// The key's slash and colon aren't safe in a file name, so become dashes.
const FINAL_PATH = `${DIRECTORY}/login-abc-1.json`;
const MESSAGE: EmailMessage = {
  to: "mabel@example.test",
  subject: "Your sign-in link",
  text: "Sign in: https://site.example/login",
  html: '<a href="https://site.example/login">Sign in</a>',
  idempotencyKey: "login/abc:1",
};

// sentAt, as an ISO 8601 time to the millisecond in UTC.
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

// The subject of either of two overlapping writes.
const EITHER_SUBJECT = /^Your (?:sign-in|second) link$/u;

// The address EMAIL_FROM_ADDRESS names in these tests.
const FROM_ADDRESS = "sender@example.test";

function savedEmail(): unknown {
  return JSON.parse(readFakeFile(FINAL_PATH) ?? "null");
}

beforeEach(() => {
  resetFakeDisk();
  vi.stubEnv("EMAIL_FROM_ADDRESS", FROM_ADDRESS);
});

afterEach(vi.unstubAllEnvs);

test("makes the outbox and puts the whole email under its key only once written", async () => {
  const write = holdNextWrite();

  const writing = writeToOutbox(MESSAGE, DIRECTORY);
  await write.started;

  try {
    // Until the email is whole, nothing appears under the final name.
    expect(readFakeFile(FINAL_PATH)).toBeUndefined();
  } finally {
    write.release();
    await writing;
  }

  expect(filesIn(DIRECTORY)).toEqual([FINAL_PATH]);
  expect(savedEmail()).toEqual({
    from: `${EMAIL_SENDER_COPY.name} <${FROM_ADDRESS}>`,
    to: MESSAGE.to,
    subject: MESSAGE.subject,
    text: MESSAGE.text,
    html: MESSAGE.html,
    sentAt: expect.stringMatching(ISO_TIME),
  });
});

test("keeps the published email whole while its replacement is being written", async () => {
  await writeToOutbox(MESSAGE, DIRECTORY);
  const published = readFakeFile(FINAL_PATH);
  const replacement: EmailMessage = {
    ...MESSAGE,
    subject: "Your replacement link",
    text: "Use the replacement sign-in link",
    html: "<p>Use the replacement sign-in link</p>",
  };
  const write = holdNextWrite();
  const writing = writeToOutbox(replacement, DIRECTORY);
  await write.started;

  try {
    expect(readFakeFile(FINAL_PATH)).toBe(published);
    expect(savedEmail()).toMatchObject({
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
  } finally {
    write.release();
    await writing;
  }

  expect(filesIn(DIRECTORY)).toEqual([FINAL_PATH]);
  expect(savedEmail()).toMatchObject({
    subject: replacement.subject,
    text: replacement.text,
    html: replacement.html,
  });
});

test("keeps one whole email when two writes under one key overlap", async () => {
  await Promise.all([
    writeToOutbox(MESSAGE, DIRECTORY),
    writeToOutbox({ ...MESSAGE, subject: "Your second link" }, DIRECTORY),
  ]);

  // Had they shared a temporary file, the second rename would find none.
  expect(filesIn(DIRECTORY)).toEqual([FINAL_PATH]);
  expect(savedEmail()).toMatchObject({
    to: MESSAGE.to,
    subject: expect.stringMatching(EITHER_SUBJECT),
  });
});
