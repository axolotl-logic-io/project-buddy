/// <reference types="vite/client" />
// The use cases and the e2e tests stay in step: each case's slug is unique
// and names an e2e test, or is pending in `e2e/pending-cases.ts` until a
// lane writes that test; each slug the e2e files or the cases name is a case;
// each e2e test is titled by a slug or sits in a group titled by one; and
// each relative link in these files leads to a file and a heading that
// exist.
import {
  type CallExpression,
  createSourceFile,
  isCallExpression,
  isStringLiteral,
  isStringLiteralLike,
  isTemplateLiteral,
  type Node,
  ScriptTarget,
  type SourceFile,
} from "typescript";
import { describe, expect, test } from "vitest";
import { PENDING_CASES } from "../e2e/pending-cases.ts";

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
const SLUG_TITLE = /^use_case_[a-z0-9_]+$/u;
const CASE_HEADING = /^## (?<slug>use_case_[a-z0-9_]+)$/gmu;
const HEADING = /^#{1,6} (?<heading>.+)$/gmu;
// The visual tests (e2e/visual/) each shoot a page, not a use case, so their
// titles name the shot instead of a slug.
const VISUAL_FOLDER = "/e2e/visual/";
// The callees that declare a test, and a group of tests, such as
// `test.describe.serial`. `test.skip`, `test.fixme` and `test.fail` declare a
// test when given a title; given a condition, they mark the running test.
// Others, such as `test.step` or `test.use`, declare none.
const TEST_CALLEE = /^test(?:\.only)?$/u;
const MARKED_TEST_CALLEE = /^test\.(?:skip|fixme|fail)$/u;
const GROUP_CALLEE =
  /^test\.describe(?:\.(?:only|skip|fixme|serial|parallel))*$/u;
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

// One call in an e2e file that declares a test or a group of tests, such as
// `test("use_case_send_message", …)` or `test.describe(\`at ${width} px\`, …)`.
interface Declaration {
  readonly kind: "test" | "group";
  // Where it is, as `<file>:<line>`, and its title as written.
  readonly at: string;
  // Its title, when that is a slug written whole.
  readonly slug: string | undefined;
  // The title of the innermost group around it that is titled by a slug.
  readonly inCase: string | undefined;
}

// Whether the call declares a test, a group, or neither: a step, a hook, or
// `test.skip(condition)` inside a test, whose first argument is no title.
function kindOf(
  file: SourceFile,
  call: CallExpression,
): Declaration["kind"] | undefined {
  const callee = call.expression.getText(file);
  const [title] = call.arguments;
  if (title === undefined) {
    return undefined;
  }
  if (GROUP_CALLEE.test(callee)) {
    return "group";
  }
  const titled = isStringLiteral(title) || isTemplateLiteral(title);
  if (TEST_CALLEE.test(callee) || (titled && MARKED_TEST_CALLEE.test(callee))) {
    return "test";
  }
  return undefined;
}

// The declaration a call makes, if any, inside the group titled by inCase.
function declarationOf(
  file: SourceFile,
  call: CallExpression,
  inCase: string | undefined,
): Declaration | undefined {
  const kind = kindOf(file, call);
  const [title] = call.arguments;
  if (kind === undefined || title === undefined) {
    return undefined;
  }
  const { line } = file.getLineAndCharacterOfPosition(call.getStart(file));
  let slug: string | undefined;
  if (isStringLiteralLike(title) && SLUG_TITLE.test(title.text)) {
    slug = title.text;
  }
  const at = `${file.fileName}:${line + 1} ${title.getText(file)}`;
  return { kind, at, slug, inCase };
}

// Every test and group of tests the e2e file at path declares.
function declarationsIn(path: string, text: string): readonly Declaration[] {
  const file = createSourceFile(path, text, ScriptTarget.Latest, true);
  const found: Declaration[] = [];
  function visit(node: Node, inCase: string | undefined): void {
    let inner = inCase;
    if (isCallExpression(node)) {
      const declaration = declarationOf(file, node, inCase);
      if (declaration !== undefined) {
        found.push(declaration);
        if (declaration.kind === "group") {
          inner = declaration.slug ?? inCase;
        }
      }
    }
    node.forEachChild((child) => visit(child, inner));
  }
  visit(file, undefined);
  return found;
}

// The tests in an e2e file that are neither titled by a slug nor inside a
// group titled by one, each as `<file>:<line> <title>`.
function testsOutsideCases(path: string, text: string): readonly string[] {
  return declarationsIn(path, text)
    .filter(
      ({ kind, slug, inCase }) =>
        kind === "test" && slug === undefined && inCase === undefined,
    )
    .map(({ at }) => at);
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
const DECLARATIONS = Object.entries(E2E_FILES).flatMap(([path, text]) =>
  declarationsIn(path, text),
);
const TESTED: ReadonlySet<string> = new Set(
  DECLARATIONS.flatMap(({ slug }) => slug ?? []),
);
const PENDING: ReadonlySet<string> = new Set(
  PENDING_CASES.map(({ slug }) => slug),
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

  test("each name an e2e test or group of tests, or are pending", () => {
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

  test("are the only slugs the e2e files and the cases name", () => {
    const named = [...Object.values(E2E_FILES), ...Object.values(CASE_FILES)]
      .flatMap((text) => text.match(SLUG) ?? [])
      .filter((slug) => !CASES.includes(slug));

    expect(named).toStrictEqual([]);
  });

  test("name every e2e test outside e2e/visual/, by its title or its group's", () => {
    const outside = Object.entries(E2E_FILES)
      .filter(([path]) => !path.startsWith(VISUAL_FOLDER))
      .flatMap(([path, text]) => testsOutsideCases(path, text));

    expect(outside).toStrictEqual([]);
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

describe("an e2e test", () => {
  test("is named by a slug title, its own or a group's around it", () => {
    const spec = `
      test("use_case_send_message", async () => {
        test.skip(isWebKit, "a runtime skip is no test");
        await test.step("a step is no test", async () => {});
      });
      test.describe("use_case_hide_extras", () => {
        for (const width of [320, 390]) {
          test.describe(\`at \${width} px\`, () => {
            test(\`fits \${width} px\`, async () => {});
          });
        }
        test.fixme("a plain title", async () => {});
      });
      test.describe.serial(\`use_case_sign_up\`, () => {
        test("a plain title", async () => {});
      });
    `;

    expect(testsOutsideCases("/e2e/named.spec.ts", spec)).toStrictEqual([]);
    expect(
      declarationsIn("/e2e/named.spec.ts", spec).flatMap(
        ({ slug }) => slug ?? [],
      ),
    ).toStrictEqual([
      "use_case_send_message",
      "use_case_hide_extras",
      "use_case_sign_up",
    ]);
  });

  test("is not named by a plain title, or a plain group's", () => {
    const spec = `
      test("a plain title", async () => {});
      test.only("use_case_send_message, and more", async () => {});
      test.describe("a plain group", () => {
        test(\`a plain template\`, async () => {});
      });
      test.describe(() => {
        test("an untitled group's test", async () => {});
      });
      test(TITLE, async () => {});
    `;

    expect(testsOutsideCases("/e2e/plain.spec.ts", spec)).toStrictEqual([
      '/e2e/plain.spec.ts:2 "a plain title"',
      '/e2e/plain.spec.ts:3 "use_case_send_message, and more"',
      "/e2e/plain.spec.ts:5 `a plain template`",
      '/e2e/plain.spec.ts:8 "an untitled group\'s test"',
      "/e2e/plain.spec.ts:10 TITLE",
    ]);
  });
});
