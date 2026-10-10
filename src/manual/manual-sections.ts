import { MANUAL_BASE_URL } from "./manual-source.ts";
import { splitRstSections } from "./split-rst.ts";

export interface ManualSection {
  title: string;
  text: string;
  // Relative to the repository root, such as "manual/index.rst".
  filePath: string;
  url: string;
  anchor: string;
}

// The RST files of a checkout of the manual.
export interface ManualFiles {
  // Every RST file under manual/, relative to the repository root, such as
  // "manual/index.rst", in any order.
  rstPaths(): Promise<string[]>;
  read(filePath: string): Promise<string>;
}

const MANUAL_DIRECTORY_PREFIX = /^manual\//u;
const RST_EXTENSION = /\.rst$/u;
// The manual has about 2,400 files; reading them all at once could run out
// of file handles.
const MAX_FILES_READ_AT_ONCE = 64;

// Maps every item through `transform`, at most `limit` at a time, keeping
// their order.
async function mapInBatches<Item, Result>(
  items: readonly Item[],
  limit: number,
  transform: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  if (items.length === 0) {
    return [];
  }
  const batch = await Promise.all(items.slice(0, limit).map(transform));
  const rest = await mapInBatches(items.slice(limit), limit, transform);
  return [...batch, ...rest];
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
  const rstPaths = (await files.rstPaths()).toSorted();
  const sectionsByFile = await mapInBatches(
    rstPaths,
    MAX_FILES_READ_AT_ONCE,
    async (filePath) =>
      manualSectionsFromRst(filePath, await files.read(filePath)),
  );
  return sectionsByFile.flat();
}
