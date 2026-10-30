// The tests and groups of tests that e2e and Vitest test files declare, read
// from their source, for use-cases.test.ts to match against the use cases.
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

const SLUG_TITLE = /^use_case_[a-z0-9_]+$/u;
// The callees that declare a test, and a group of tests, such as
// `test.describe.serial`. `test.skip`, `test.fixme` and `test.fail` declare a
// test when given a title; given a condition, they mark the running test.
// Others, such as `test.step` or `test.use`, declare none.
const TEST_CALLEE = /^test(?:\.only)?$/u;
const MARKED_TEST_CALLEE = /^test\.(?:skip|fixme|fail)$/u;
const GROUP_CALLEE =
  /^test\.describe(?:\.(?:only|skip|fixme|serial|parallel))*$/u;
// Vitest's, in files outside test/system/: `it.skip`, `describe.only` and the like, given a
// title. The curried forms, such as `test.each(table)(title, fn)` or
// `describe.skipIf(condition)(title, fn)`, declare what their base does.
// Playwright's own folder: the system tests.
const PLAYWRIGHT_FOLDER = "/test/system/";
const SRC_TEST_CALLEE =
  /^(?:test|it)(?:\.(?:only|skip|todo|fails|concurrent|sequential))*$/u;
const SRC_GROUP_CALLEE =
  /^describe(?:\.(?:only|skip|todo|concurrent|sequential|shuffle))*$/u;
const CURRIED_MODIFIER = /\.(?:each|for|runIf|skipIf)$/u;

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

// Whether a Vitest file's call, titled, declares a test, a group, or neither,
// such as `vi.fn(…)`.
function srcKindOf(
  file: SourceFile,
  call: CallExpression,
): Declaration["kind"] | undefined {
  let callee = call.expression.getText(file);
  if (isCallExpression(call.expression)) {
    const base = call.expression.expression.getText(file);
    if (!CURRIED_MODIFIER.test(base)) {
      return undefined;
    }
    callee = base.replace(CURRIED_MODIFIER, "");
  }
  if (SRC_GROUP_CALLEE.test(callee)) {
    return "group";
  }
  if (SRC_TEST_CALLEE.test(callee)) {
    return "test";
  }
  return undefined;
}

// Whether the call declares a test, a group, or neither: a step, a hook, or
// `test.skip(condition)` inside a test, whose first argument is no title.
// Files in test/system/ use Playwright's names; the others, Vitest's.
function kindOf(
  file: SourceFile,
  call: CallExpression,
): Declaration["kind"] | undefined {
  const callee = call.expression.getText(file);
  const [title] = call.arguments;
  if (title === undefined) {
    return undefined;
  }
  if (!file.fileName.startsWith(PLAYWRIGHT_FOLDER)) {
    return srcKindOf(file, call);
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

// Every test and group of tests the e2e or Vitest test file at path declares.
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

// The declarations titled by a slug that names none of cases, each as
// `<file>:<line> <title>`.
function unknownSlugTitles(
  declarations: readonly Declaration[],
  cases: readonly string[],
): readonly string[] {
  return declarations
    .filter(({ slug }) => slug !== undefined && !cases.includes(slug))
    .map(({ at }) => at);
}

// The declarations that name a case not in authCases, by their own slug
// title or, failing that, the innermost slug-titled group around them, each
// as `<file>:<line> <title>`. A declaration that names no case is not here:
// testsOutsideCases reports an e2e test of that kind.
function outsideAuthCases(
  declarations: readonly Declaration[],
  authCases: readonly string[],
): readonly string[] {
  return declarations
    .filter(({ slug, inCase }) => {
      const named = slug ?? inCase;
      return named !== undefined && !authCases.includes(named);
    })
    .map(({ at }) => at);
}

export type { Declaration };
export {
  declarationsIn,
  outsideAuthCases,
  testsOutsideCases,
  unknownSlugTitles,
};
