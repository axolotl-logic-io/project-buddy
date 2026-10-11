import { MANUAL_BASE_URL } from "./manual-source.ts";
import { splitRstSections } from "./split-rst.ts";

const MANUAL_DIRECTORY_PREFIX = /^manual\//u;
const RST_EXTENSION = /\.rst$/u;

// Orders strings by UTF-16 code units, as Array.prototype.sort does by
// default.
function compareCodeUnits(left: string, right: string): -1 | 0 | 1 {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export interface ManualSection {
  title: string;
  text: string;
  // Relative to the repository root, such as "manual/index.rst".
  filePath: string;
  url: string;
  anchor: string;
}

// The RST files of a clone of the manual.
export interface ManualFiles {
  // Every RST file under manual/, relative to the repository root, such as
  // "manual/index.rst", in any order.
  rstPaths: () => Promise<string[]>;
  read: (filePath: string) => Promise<string>;
}

export function manualUrl(filePath: string, anchor: string): string {
  const page = filePath
    .replace(MANUAL_DIRECTORY_PREFIX, "")
    .replace(RST_EXTENSION, ".html");
  return `${MANUAL_BASE_URL}${page}#${anchor}`;
}

export function manualSectionsFromRst(
  filePath: string,
  rst: string,
): ManualSection[] {
  return splitRstSections(rst).map(({ title, text, anchor }) => ({
    title,
    text,
    filePath,
    url: manualUrl(filePath, anchor),
    anchor,
  }));
}

// Sections of every RST file of the manual, in file path order.
export async function readManualSections(
  files: ManualFiles,
): Promise<ManualSection[]> {
  const rstPaths = (await files.rstPaths()).toSorted(compareCodeUnits);
  const sectionsByFile = await Promise.all(
    rstPaths.map(async (filePath) =>
      manualSectionsFromRst(filePath, await files.read(filePath)),
    ),
  );
  return sectionsByFile.flat();
}
