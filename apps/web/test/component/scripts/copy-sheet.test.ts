import ts from "typescript";
import { describe, expect, test } from "vitest";
import { copyCsv, copyFields } from "../../../scripts/copy-sheet.ts";

function extract(source: string): ReturnType<typeof copyFields> {
  const file = "/copy.ts";
  const host = ts.createCompilerHost({});
  host.getSourceFile = (name: string): ts.SourceFile | undefined => {
    if (name === file) {
      return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    }
    return undefined;
  };
  const program = ts.createProgram(
    [file],
    { noLib: true, noResolve: true },
    host,
  );
  return copyFields(program, [file]);
}

describe("copy spreadsheet", (): void => {
  test("hides ordinary copy and counts each interpolation once", (): void => {
    const fields = extract(`
      const EXAMPLE_COPY = {
        plain: "Do not show these words",
        template: (name: string) => \`Hello \${name.trim().replace(" ", "-")} today\`,
        literalTemplate: "Hello {{name}} today",
      };
    `);
    expect(fields).toEqual([
      {
        identifier: "EXAMPLE_COPY.literalTemplate",
        words: 3,
        placeholders: ["{{name}}"],
      },
      { identifier: "EXAMPLE_COPY.plain", words: 5, placeholders: [] },
      {
        identifier: "EXAMPLE_COPY.template",
        words: 3,
        placeholders: ['{{name.trim().replace("_",_"-")}}'],
      },
    ]);
    expect(JSON.stringify(fields)).not.toContain("Do not show");
  });

  test("includes nested fields, shared values, lookups and every wording variant", (): void => {
    const fields = extract(`
      const SHARED = { label: "Two words" };
      const PROBLEMS = { empty: "Write something", long: "Use fewer words" };
      const EXAMPLE_COPY = {
        nested: { ...SHARED },
        problem: (key: keyof typeof PROBLEMS) => PROBLEMS[key],
        count: (n: number) => { if (n === 1) return "One item"; return \`\${n} items\`; },
      };
    `);
    expect(fields.map((field): string => field.identifier)).toEqual([
      "EXAMPLE_COPY.count.variant1",
      "EXAMPLE_COPY.count.variant2",
      "EXAMPLE_COPY.nested.label",
      "EXAMPLE_COPY.problem.variant1",
      "EXAMPLE_COPY.problem.variant2",
    ]);
    const threeWords = 3;
    expect(fields.map((field): number => field.words)).toEqual([
      2,
      2,
      2,
      2,
      threeWords,
    ]);
  });

  test("quotes commas, quotes and line breaks and leaves Copy empty", (): void => {
    expect(
      copyCsv([
        {
          identifier: "FOO.bar",
          words: 4,
          placeholders: ["{{name}}"],
          description: `Greeting, with "{{name}}"
on a separate line`,
        },
      ]),
    ).toBe(
      '"Identifier","Needed Word Count (Approx)","Description","Copy"\r\n"FOO.bar","4","Greeting, with ""{{name}}""\non a separate line",""\r\n',
    );
  });

  test("refuses unknown expressions instead of silently omitting fields", (): void => {
    expect((): unknown =>
      extract("const EXAMPLE_COPY = { text: unknownFunction() };"),
    ).toThrow("Unsupported copy");
  });
});
