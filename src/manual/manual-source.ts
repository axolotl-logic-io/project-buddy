// Where the reindex script gets the Blender Reference Manual, and how the
// manual's repository lays out its pages. When a new stable Blender release
// ships, set MANUAL_BRANCH to its release branch and run
// `npm run manual:reindex`.

// Matches html_baseurl in the branch's manual/conf.py. `latest` serves the
// latest stable release, which is the branch indexed.
const MANUAL_BASE_URL = "https://docs.blender.org/manual/en/latest/";
const MANUAL_BASE: URL = new URL(MANUAL_BASE_URL);

// The repository's layout: each page of the manual is an RST file under
// manual/, and Sphinx builds it into the HTML page at the same path.
const MANUAL_PAGE_PATH = /^manual\/(?<page>.+)\.rst$/u;

// link as a URL, or null if it is malformed. Not URL.parse: isManualUrl runs
// in the browser (markdown.tsx's onLinkCheck), and Safari before 18 and
// Firefox before 126 lack it.
function parseUrl(link: string): URL | null {
  try {
    return new URL(link);
  } catch {
    return null;
  }
}

export const MANUAL_REPOSITORY_URL =
  "https://projects.blender.org/blender/blender-manual.git";
export const MANUAL_BRANCH = "blender-v5.3-release";

// Whether filePath, from the repository root, is a page of the manual.
export function isManualPage(filePath: string): boolean {
  return MANUAL_PAGE_PATH.test(filePath);
}

// The URL of the section at anchor on the manual page at filePath, from the
// repository root.
export function manualUrl(filePath: string, anchor: string): string {
  const page = filePath.replace(MANUAL_PAGE_PATH, "$<page>.html");
  return `${MANUAL_BASE_URL}${page}#${anchor}`;
}

// Whether link is a page of the latest manual on its own site, the place
// manualUrl links to. Lookalike hosts, plain http, other paths on the same
// host and malformed links are not.
export function isManualUrl(link: string): boolean {
  const url = parseUrl(link);
  return (
    url !== null &&
    url.protocol === MANUAL_BASE.protocol &&
    url.host === MANUAL_BASE.host &&
    url.username === "" &&
    url.password === "" &&
    url.pathname.startsWith(MANUAL_BASE.pathname)
  );
}
