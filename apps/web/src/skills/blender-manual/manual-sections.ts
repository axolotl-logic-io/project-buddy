import { manualUrl } from "./manual-source.ts";
import { splitRstSections } from "./split-rst.ts";

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
  // The page's path from the repository root.
  filePath: string;
  url: string;
  anchor: string;
}

// The pages of a clone of the manual.
export interface ManualFiles {
  // The path of every page, as isManualPage decides, from the repository
  // root, in any order.
  pagePaths: () => Promise<string[]>;
  // The RST source of the page at filePath.
  read: (filePath: string) => Promise<string>;
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

// Sections of every page of the manual, in file path order.
export async function readManualSections(
  files: ManualFiles,
): Promise<ManualSection[]> {
  const pagePaths = (await files.pagePaths()).toSorted(compareCodeUnits);
  const sectionsByFile = await Promise.all(
    pagePaths.map(async (filePath) =>
      manualSectionsFromRst(filePath, await files.read(filePath)),
    ),
  );
  return sectionsByFile.flat();
}
