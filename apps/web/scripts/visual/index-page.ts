// The comparison page compare.ts writes as index.html: each view's
// screenshots from the site beside its mockup's, in each appearance and at
// each width, with the views that have no mockup, the mockups with no view
// and any problems listed first. Image paths are relative to the page.

// One screenshot of the site and, when the view has a mockup, of the mockup.
interface ComparedShot {
  readonly name: string;
  readonly account: string;
  readonly appearance: string;
  readonly width: number;
  readonly app: string;
  readonly mockup: string | undefined;
  readonly problems: readonly string[];
}

// The mockup folder compared with, and its pages that match no view.
interface MockupFolder {
  readonly folder: string;
  readonly unused: readonly string[];
}

interface ComparisonSummary {
  readonly shots: readonly ComparedShot[];
  // Undefined when no mockups were compared.
  readonly mockups: MockupFolder | undefined;
  readonly site: string;
  readonly takenAt: string;
}

const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const SPECIAL = /[&<>"']/gu;

function escapeHtml(text: string): string {
  return text.replace(
    SPECIAL,
    (character: string): string => ESCAPES[character] ?? character,
  );
}

const STYLE = `
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
body { margin: 0 auto; padding: 1.5rem; max-inline-size: 120rem; }
h1 { margin-block: 0 0.5rem; }
.filters { display: flex; flex-wrap: wrap; gap: 1rem; position: sticky; top: 0; z-index: 1; padding-block: 0.5rem; background: Canvas; }
fieldset { display: flex; gap: 0.75rem; border: 1px solid GrayText; }
.flag { color: #b3261e; font-weight: 600; }
.view { border-block-start: 1px solid GrayText; padding-block: 1rem; }
.view h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
.pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-block: 1rem; }
.pair[hidden] { display: none; }
.pair[data-phone] { grid-template-columns: repeat(2, minmax(0, 24rem)); }
.pair h3 { grid-column: 1 / -1; margin: 0; font-size: 1rem; }
figure { margin: 0; }
figcaption { font-size: 0.875rem; margin-block-end: 0.25rem; }
img { display: block; inline-size: 100%; block-size: auto; border: 1px solid GrayText; }
.missing { display: grid; place-items: center; min-block-size: 8rem; border: 2px dashed #b3261e; }
.problems { color: #b3261e; margin: 0.25rem 0; }
`;

// Hides the pairs not in the chosen appearance and width.
const SCRIPT = `
const form = document.querySelector(".filters");
function show() {
  const appearance = form.elements.appearance.value;
  const width = form.elements.width.value;
  for (const pair of document.querySelectorAll(".pair")) {
    pair.hidden = (appearance !== "all" && pair.dataset.appearance !== appearance) ||
      (width !== "all" && pair.dataset.width !== width);
  }
}
form.addEventListener("change", show);
show();
`;

// Pairs narrower than this are shown at a phone's size.
const PHONE_BELOW = 1024;

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function list(items: readonly string[]): string {
  const entries = items.map(
    (item: string): string => `<li>${escapeHtml(item)}</li>`,
  );
  return `<ul>${entries.join("")}</ul>`;
}

function radio(name: string, value: string): string {
  let checked = "";
  if (value === "all") {
    checked = " checked";
  }
  return `<label><input type="radio" name="${name}" value="${escapeHtml(value)}"${checked}> ${escapeHtml(value)}</label>`;
}

function radios(name: string, values: readonly string[]): string {
  return ["all", ...values]
    .map((value: string): string => radio(name, value))
    .join("");
}

function figure(caption: string, image: string | undefined): string {
  if (image === undefined) {
    return `<figure><figcaption>${caption}</figcaption><div class="missing flag">No mockup</div></figure>`;
  }
  const source = escapeHtml(image);
  return `<figure><figcaption>${caption}</figcaption><a href="${source}"><img loading="lazy" src="${source}" alt=""></a></figure>`;
}

function pair(shot: ComparedShot, withMockups: boolean): string {
  let problems = "";
  if (shot.problems.length > 0) {
    problems = `<p class="problems">${shot.problems.map(escapeHtml).join("<br>")}</p>`;
  }
  let mockup = "";
  if (withMockups) {
    mockup = figure("Mockup", shot.mockup);
  }
  let phone = "";
  if (shot.width < PHONE_BELOW) {
    phone = " data-phone";
  }
  return `<section class="pair" data-appearance="${escapeHtml(shot.appearance)}" data-width="${shot.width}"${phone}>
<h3>${escapeHtml(shot.appearance)}, ${shot.width} px</h3>${problems}
${figure("Site", shot.app)}${mockup}
</section>`;
}

// The views with screenshots but no mockup, in order.
function viewsWithoutMockup(shots: readonly ComparedShot[]): string[] {
  return unique(
    shots
      .filter((shot: ComparedShot): boolean => shot.mockup === undefined)
      .map((shot: ComparedShot): string => shot.name),
  );
}

function shotLabel(shot: ComparedShot): string {
  return `${shot.name}, ${shot.appearance}, ${shot.width} px: ${shot.problems.join(" ")}`;
}

// The notes above the views: the mockups that are missing or unused, and
// the screenshots that had problems.
function notes(summary: ComparisonSummary): string[] {
  const { shots, mockups } = summary;
  const lines: string[] = [];
  if (mockups === undefined) {
    lines.push("<p>No mockup folder was given, so only the site is shown.</p>");
  } else {
    lines.push(
      `<p>Mockups from <code>${escapeHtml(mockups.folder)}</code>.</p>`,
    );
    const missing = viewsWithoutMockup(shots);
    if (missing.length === 0) {
      lines.push("<p>Every view has a mockup.</p>");
    } else {
      lines.push(
        `<p class="flag">${missing.length} views have no mockup:</p>${list(missing)}`,
      );
    }
    if (mockups.unused.length > 0) {
      lines.push(
        `<p>${mockups.unused.length} mockups match no view in views.ts:</p>${list(mockups.unused)}`,
      );
    }
  }
  const troubled = shots.filter(
    (shot: ComparedShot): boolean => shot.problems.length > 0,
  );
  if (troubled.length > 0) {
    lines.push(
      `<p class="flag">${troubled.length} screenshots had problems:</p>${list(troubled.map(shotLabel))}`,
    );
  }
  return lines;
}

function viewSection(
  name: string,
  shots: readonly ComparedShot[],
  withMockups: boolean,
): string {
  const own = shots.filter((shot: ComparedShot): boolean => shot.name === name);
  let flag = "";
  if (
    withMockups &&
    own.every((shot: ComparedShot): boolean => shot.mockup === undefined)
  ) {
    flag = ' <span class="flag">No mockup</span>';
  }
  const pairs = own.map((shot: ComparedShot): string =>
    pair(shot, withMockups),
  );
  return `<section class="view" id="${escapeHtml(name)}">
<h2>${escapeHtml(name)}${flag}</h2>
<p>Signed in as: ${escapeHtml(own[0]?.account ?? "")}</p>
${pairs.join("\n")}
</section>`;
}

function comparisonPage(summary: ComparisonSummary): string {
  const { shots } = summary;
  const withMockups = summary.mockups !== undefined;
  const names = unique(shots.map((shot: ComparedShot): string => shot.name));
  const sections = names.map((name: string): string =>
    viewSection(name, shots, withMockups),
  );
  const appearances = unique(
    shots.map((shot: ComparedShot): string => shot.appearance),
  );
  const widths = unique(
    shots.map((shot: ComparedShot): string => `${shot.width}`),
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Site and mockups compared</title>
<style>${STYLE}</style>
</head>
<body>
<h1>Site and mockups compared</h1>
<p>${shots.length} screenshots of ${names.length} views from ${escapeHtml(summary.site)}, taken ${escapeHtml(summary.takenAt)}.</p>
${notes(summary).join("\n")}
<form class="filters">
<fieldset><legend>Appearance</legend>${radios("appearance", appearances)}</fieldset>
<fieldset><legend>Width</legend>${radios("width", widths)}</fieldset>
</form>
${sections.join("\n")}
<script>${SCRIPT}</script>
</body>
</html>
`;
}

export type { ComparedShot, ComparisonSummary, MockupFolder };
export { comparisonPage, escapeHtml, viewsWithoutMockup };
