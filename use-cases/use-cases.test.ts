/// <reference types="vite/client" />
// The use cases and the e2e tests stay in step: each case's slug is unique
// and names an e2e test, or a pending `test.fixme` stub until a lane writes
// that test; each slug the e2e files or the cases name is a case; and each
// relative link in these files leads to a file and a heading that exist.
import { describe, expect, test } from "vitest";

const CASE_FILES = import.meta.glob<string>("./*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const E2E_FILES = import.meta.glob<string>("/e2e/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const SLUG = /use_case_[a-z0-9_]+/gu;
const CASE_HEADING = /^## (?<slug>use_case_[a-z0-9_]+)$/gmu;
const HEADING = /^#{1,6} (?<heading>.+)$/gmu;
// The title of a test or a group of tests that is exactly a slug.
const TEST_TITLE =
  /\btest(?:\.describe)?\(\s*(?<quote>["'`])(?<slug>use_case_[a-z0-9_]+)\k<quote>/gu;
// The title of a pending stub, `test.fixme("<slug>")`: a case whose test a
// later lane writes.
const PENDING_TITLE =
  /\btest\.fixme\(\s*(?<quote>["'`])(?<slug>use_case_[a-z0-9_]+)\k<quote>/gu;
// A Markdown link with no scheme: [text](file.md#anchor), either part
// optional.
const RELATIVE_LINK =
  /\[(?<text>[^\]]*)\]\((?![a-z]+:)(?<file>[^)#]*)(?:#(?<anchor>[^)]*))?\)/gu;
const LINKED_SLUG = /^`(?<slug>use_case_[a-z0-9_]+)`$/u;
const NOT_IN_ANCHOR = /[^\p{L}\p{N}\s_-]/gu;
const SPACE = /\s/gu;

// The group `name` of every match of pattern in text.
function capturesIn(
  text: string,
  pattern: RegExp,
  name: string,
): readonly string[] {
  return [...text.matchAll(pattern)].flatMap(
    (match) => match.groups?.[name] ?? [],
  );
}

// The anchor a heading gets, as GitHub writes it.
function anchorOf(heading: string): string {
  return heading.toLowerCase().replace(NOT_IN_ANCHOR, "").replace(SPACE, "-");
}

// The case file a link in the case file `from` leads to: its own file when
// the link names none.
function linkedFile(from: string, file: string): string | undefined {
  if (file === "") {
    return CASE_FILES[from];
  }
  return CASE_FILES[`./${file}`];
}

// Why a link in the case file `from` doesn't lead where it says, if it
// doesn't. A link named by a slug must lead to that case.
function linkProblems(
  from: string,
  { text = "", file = "", anchor }: Partial<Record<string, string>>,
): readonly string[] {
  const target = linkedFile(from, file);
  if (target === undefined) {
    return [`${from}: no file ${file}`];
  }
  if (
    anchor !== undefined &&
    !capturesIn(target, HEADING, "heading").map(anchorOf).includes(anchor)
  ) {
    return [`${from}: no heading #${anchor} in ${file}`];
  }
  const { slug } = LINKED_SLUG.exec(text)?.groups ?? {};
  if (slug !== undefined && anchor !== slug) {
    return [`${from}: ${text} leads to #${anchor ?? ""}`];
  }
  return [];
}

const CASES = Object.values(CASE_FILES).flatMap((text) =>
  capturesIn(text, CASE_HEADING, "slug"),
);
const TESTED = new Set(
  Object.values(E2E_FILES).flatMap((text) =>
    capturesIn(text, TEST_TITLE, "slug"),
  ),
);
const PENDING = new Set(
  Object.values(E2E_FILES).flatMap((text) =>
    capturesIn(text, PENDING_TITLE, "slug"),
  ),
);

describe("the use cases", () => {
  test("are read from every area's file and every e2e file", () => {
    expect(Object.keys(CASE_FILES)).toContain("./README.md");
    expect(Object.keys(CASE_FILES)).toContain("./chats.md");
    expect(Object.keys(E2E_FILES)).toContain("/e2e/chats.spec.ts");
    expect(CASES).toContain("use_case_send_message");
    expect(TESTED).toContain("use_case_send_message");
  });

  test("each have a slug no other case has", () => {
    const repeated = CASES.filter(
      (slug, index) => CASES.indexOf(slug) !== index,
    );

    expect(repeated).toStrictEqual([]);
  });

  test("each name an e2e test or group of tests, or a pending stub", () => {
    expect(
      CASES.filter((slug) => !(TESTED.has(slug) || PENDING.has(slug))),
    ).toStrictEqual([]);
  });

  test("keep a pending stub only until a real test names them", () => {
    expect([...PENDING].filter((slug) => TESTED.has(slug))).toStrictEqual([]);
  });

  test("are the only slugs the e2e files and the cases name", () => {
    const named = [...Object.values(E2E_FILES), ...Object.values(CASE_FILES)]
      .flatMap((text) => text.match(SLUG) ?? [])
      .filter((slug) => !CASES.includes(slug));

    expect(named).toStrictEqual([]);
  });

  test("link only to files and headings that exist", () => {
    const broken = Object.entries(CASE_FILES).flatMap(([from, text]) =>
      [...text.matchAll(RELATIVE_LINK)].flatMap((link) =>
        linkProblems(from, link.groups ?? {}),
      ),
    );

    expect(broken).toStrictEqual([]);
  });
});
