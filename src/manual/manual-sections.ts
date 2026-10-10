import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { MANUAL_BASE_URL } from "./manual-source.ts";
import { splitRstSections } from "./split-rst.ts";

export type ManualSection = {
  title: string;
  text: string;
  // Relative to the repository root, such as "manual/index.rst".
  filePath: string;
  url: string;
  anchor: string;
};

export function manualUrl(filePath: string, anchor: string): string {
  const page = filePath.replace(/^manual\//u, "").replace(/\.rst$/u, ".html");
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

// Sections of every RST file under manual/ in a checkout of the manual.
export async function readManualSections(
  repositoryDir: string,
): Promise<ManualSection[]> {
  const manualDir = join(repositoryDir, "manual");
  const rstPaths = (await readdir(manualDir, { recursive: true }))
    .filter((path) => path.endsWith(".rst"))
    .map((path) => `manual/${path.split("\\").join("/")}`)
    .sort();
  const sections: ManualSection[] = [];
  for (const filePath of rstPaths) {
    const rst = await readFile(join(repositoryDir, filePath), "utf8");
    sections.push(...manualSectionsFromRst(filePath, rst));
  }
  return sections;
}
