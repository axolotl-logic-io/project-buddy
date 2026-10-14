import { describe, expect, test } from "vitest";
import {
  declarationsIn,
  testsOutsideCases,
  unknownSlugTitles,
} from "./test-declarations.ts";

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

describe("a src test", () => {
  test("is named by a slug title, its own or a group's, in Vitest's names", () => {
    const spec = `
      test("use_case_send_message", () => {});
      it("use_case_hide_extras", () => {});
      describe("use_case_sign_up", () => {
        test.only("use_case_sign_in", () => {});
        it.skip("use_case_sign_out", () => {});
      });
      describe.each([1, 2])("use_case_read_formatted_reply", () => {});
      test.each([1, 2])("use_case_rename_chat", () => {});
      describe.skipIf(isWebKit)("use_case_delete_chat", () => {});
    `;

    expect(
      declarationsIn("/src/x.test.tsx", spec).flatMap(({ slug }) => slug ?? []),
    ).toStrictEqual([
      "use_case_send_message",
      "use_case_hide_extras",
      "use_case_sign_up",
      "use_case_sign_in",
      "use_case_sign_out",
      "use_case_read_formatted_reply",
      "use_case_rename_chat",
      "use_case_delete_chat",
    ]);
  });

  test("is not named by other calls or a plain title", () => {
    const spec = `
      const open = vi.fn("use_case_x");
      test.step("use_case_send_message", () => {});
      test.describe("use_case_sign_up", () => {});
      test.each([1])(TITLE, () => {});
      test("a plain title", () => {});
      expect("use_case_hide_extras").toBe(open);
    `;

    expect(
      declarationsIn("/src/x.test.tsx", spec).flatMap(({ slug }) => slug ?? []),
    ).toStrictEqual([]);
  });

  test("names only cases by its slug titles", () => {
    const spec = `
      test("use_case_no_such_case", () => {});
      test("use_case_send_message", () => {});
      test("a plain title", () => {});
    `;

    expect(
      unknownSlugTitles(declarationsIn("/src/x.test.tsx", spec), [
        "use_case_send_message",
      ]),
    ).toStrictEqual(['/src/x.test.tsx:2 "use_case_no_such_case"']);
  });
});
