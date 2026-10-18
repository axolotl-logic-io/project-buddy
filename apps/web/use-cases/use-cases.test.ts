/// <reference types="vite/client" />
// The use cases and their tests stay in step: each case's slug is unique
// and titles a test or group of tests, either an e2e test or a Vitest test
// in a test/**/*.test.tsx file (a component or browser test) or a
// test/**/*.server.test.ts file (a server test), or is pending
// in `e2e/pending-cases.ts` until a lane writes that test; each slug the e2e
// files or the cases name is a case, and so is each slug that titles a Vitest
// test; each e2e test is titled by a slug or sits in a group titled by one;
// outside e2e/visual/, that slug is one of the auth cases in auth-cases.ts
// (the wiki's `e2e-visual-and-auth-only`), each of them a case; and each
// relative link in these files leads to a file and a heading that exist. In
// Vitest files only the titles are checked: a Vitest test may have a plain title,
// and other text there may name any slug.
import { describe, expect, test } from "vitest";
import { PENDING_CASES } from "../e2e/pending-cases.ts";
import { AUTH_CASES } from "./auth-cases.ts";
import {
  type Declaration,
  declarationsIn,
  outsideAuthCases,
  testsOutsideCases,
  unknownSlugTitles,
} from "./test-declarations.ts";

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

// The component and browser tests (*.browser.test.tsx) in test/, and the
// server tests, which run against the test database.
const SRC_FILES = import.meta.glob<string>(
  ["/test/**/*.test.tsx", "/test/**/*.server.test.ts"],
  { query: "?raw", import: "default", eager: true },
);

const SLUG = /use_case_[a-z0-9_]+/gu;
const CASE_HEADING = /^## (?<slug>use_case_[a-z0-9_]+)$/gmu;
const HEADING = /^#{1,6} (?<heading>.+)$/gmu;
// The visual tests (e2e/visual/) each shoot a page, not a use case, so their
// titles name the shot instead of a slug.
const VISUAL_FOLDER = "/e2e/visual/";
// A Markdown link with no scheme: [text](file.md#anchor), either part
// optional.
const RELATIVE_LINK =
  /\[(?<text>[^\]]*)\]\((?![a-z]+:)(?<file>[^)#]*)(?:#(?<anchor>[^)]*))?\)/gu;
const LINKED_SLUG = /^`(?<slug>use_case_[a-z0-9_]+)`$/u;
const NOT_IN_ANCHOR = /[^\p{L}\p{N}\s_-]/gu;
const SPACE = /\s/gu;
// Why an e2e test outside e2e/visual/ may name only an auth case.
const AUTH_ONLY_RULE =
  "e2e-visual-and-auth-only: outside e2e/visual/, an e2e test names only an auth case (use-cases/auth-cases.ts); test any other case in Vitest";
// The auth workflows' cases, as issue #351 lists them.
const AUTH_WORKFLOW_CASES: readonly string[] = [
  "use_case_sign_up",
  "use_case_sign_up_existing_email",
  "use_case_sign_up_wrong_invite_code",
  "use_case_sign_up_locked_out",
  "use_case_sign_in_by_link",
  "use_case_sign_in_link_reused",
  "use_case_sign_in_link_expired",
  "use_case_too_many_sign_in_requests",
  "use_case_visit_signed_out",
  "use_case_return_signed_in",
  "use_case_session_expired",
  "use_case_sign_out",
  "use_case_sign_out_everywhere",
];

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
const SRC_DECLARATIONS: readonly Declaration[] = Object.entries(
  SRC_FILES,
).flatMap(([path, text]) => declarationsIn(path, text));
const E2E_DECLARATIONS: readonly Declaration[] = Object.entries(
  E2E_FILES,
).flatMap(([path, text]) => declarationsIn(path, text));
// The e2e tests and groups outside e2e/visual/.
const NON_VISUAL_E2E_DECLARATIONS: readonly Declaration[] = Object.entries(
  E2E_FILES,
)
  .filter(([path]) => !path.startsWith(VISUAL_FOLDER))
  .flatMap(([path, text]) => declarationsIn(path, text));
const DECLARATIONS: readonly Declaration[] = [
  ...E2E_DECLARATIONS,
  ...SRC_DECLARATIONS,
];
const TESTED: ReadonlySet<string> = new Set(
  DECLARATIONS.flatMap(({ slug }) => slug ?? []),
);
const PENDING: ReadonlySet<string> = new Set(
  PENDING_CASES.map(({ slug }) => slug),
);

describe("the use cases", () => {
  test("are read from every area's file, every e2e file and every test in test/", () => {
    expect(Object.keys(CASE_FILES)).toContain("./README.md");
    expect(Object.keys(CASE_FILES)).toContain("./chats.md");
    expect(Object.keys(E2E_FILES)).toContain("/e2e/sign-in.spec.ts");
    expect(Object.keys(SRC_FILES)).toContain(
      "/test/components/chat/chat-message.browser.test.tsx",
    );
    expect(Object.keys(SRC_FILES)).toContain(
      "/test/projects/store.server.test.ts",
    );
    expect(CASES).toContain("use_case_send_message");
    expect(TESTED).toContain("use_case_send_message");
    // A browser test, with no e2e test, covers this case.
    expect(TESTED).toContain("use_case_read_formatted_reply");
    expect(
      Object.values(E2E_FILES).filter((text) =>
        text.includes('"use_case_read_formatted_reply"'),
      ),
    ).toStrictEqual([]);
  });

  test("each have a slug no other case has", () => {
    const repeated = CASES.filter(
      (slug, index) => CASES.indexOf(slug) !== index,
    );

    expect(repeated).toStrictEqual([]);
  });

  test("each name a test or group of tests, e2e or Vitest, or are pending", () => {
    expect(
      CASES.filter((slug) => !(TESTED.has(slug) || PENDING.has(slug))),
    ).toStrictEqual([]);
  });

  test("stay pending only until a real test names them", () => {
    expect([...PENDING].filter((slug) => TESTED.has(slug))).toStrictEqual([]);
  });

  test("are pending only when the slug is a case", () => {
    expect([...PENDING].filter((slug) => !CASES.includes(slug))).toStrictEqual(
      [],
    );
  });

  test("name only cases by the slug titles in Vitest tests", () => {
    expect(unknownSlugTitles(SRC_DECLARATIONS, CASES)).toStrictEqual([]);
  });

  test("name every e2e test outside e2e/visual/, by its title or its group's", () => {
    const outside = Object.entries(E2E_FILES)
      .filter(([path]) => !path.startsWith(VISUAL_FOLDER))
      .flatMap(([path, text]) => testsOutsideCases(path, text));

    expect(outside).toStrictEqual([]);
  });
});

describe("the auth cases", () => {
  test("are the 13 cases of the auth workflows, each a case", () => {
    expect([...AUTH_CASES].sort()).toStrictEqual(
      [...AUTH_WORKFLOW_CASES].sort(),
    );
    expect(AUTH_CASES.filter((slug) => !CASES.includes(slug))).toStrictEqual(
      [],
    );
  });

  test("are the only cases e2e tests outside e2e/visual/ name", () => {
    expect(
      outsideAuthCases(NON_VISUAL_E2E_DECLARATIONS, AUTH_CASES),
      AUTH_ONLY_RULE,
    ).toStrictEqual([]);
  });
});

describe("the use case files", () => {
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
