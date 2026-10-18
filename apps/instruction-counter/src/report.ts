import { z } from "zod";

const STATEMENT = z.strictObject({
  statement: z.string().trim().min(1),
  startLine: z.int().positive(),
  endLine: z.int().positive(),
});
const ANALYSIS = z.strictObject({
  instructions: z.array(STATEMENT),
  descriptiveStatements: z.array(STATEMENT),
  contentLines: z.array(z.int().positive()),
});
type Analysis = z.infer<typeof ANALYSIS>;
interface Measurement {
  filename: string;
  instructionCount: number;
  descriptiveStatementCount: number;
  contentLineCount: number;
}
const LINE_ENDING = /\r\n|[\r\n]/u;

function sourceLines(source: string): string[] {
  const lines = source.split(LINE_ENDING);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function parseAnalysis(reply: string, lines: string[]): Analysis {
  let value: unknown;
  try {
    value = JSON.parse(reply);
  } catch (cause: unknown) {
    throw new Error("Pi did not return a JSON object", { cause });
  }
  const parsed = ANALYSIS.safeParse(value);
  if (!parsed.success) {
    throw new Error("Pi returned an invalid analysis schema");
  }
  const analysis = parsed.data;
  for (const item of [
    ...analysis.instructions,
    ...analysis.descriptiveStatements,
  ]) {
    const excerpt = lines.slice(item.startLine - 1, item.endLine).join("\n");
    if (
      item.startLine > item.endLine ||
      item.endLine > lines.length ||
      excerpt.trim() === ""
    ) {
      throw new Error(
        "Pi returned a statement with an invalid or blank source range",
      );
    }
  }
  const unique = new Set(analysis.contentLines);
  if (
    unique.size !== analysis.contentLines.length ||
    analysis.contentLines.some(
      (line: number): boolean => !lines[line - 1]?.trim(),
    )
  ) {
    throw new Error(
      "Pi returned duplicate, blank or out-of-range content lines",
    );
  }
  return analysis;
}

function report(file: string, analysis: Analysis): Measurement {
  return {
    filename: file,
    instructionCount: analysis.instructions.length,
    descriptiveStatementCount: analysis.descriptiveStatements.length,
    contentLineCount: analysis.contentLines.length,
  };
}

export type { Analysis, Measurement };
export { parseAnalysis, report, sourceLines };
