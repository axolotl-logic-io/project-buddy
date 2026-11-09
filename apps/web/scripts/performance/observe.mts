declare global {
  var audit: AuditObservation;
  var auditObservers: PerformanceObserver[] | undefined;
  var stopAudit: (() => void) | undefined;
}
// Browser-side observations promoted from #773's commit-probe recipe.
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Shift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources: {
    node?: Node;
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
  }[];
}
interface Interaction extends PerformanceEntry {
  interactionId: number;
}
interface LargestPaint extends PerformanceEntry {
  size: number;
  element?: Element;
}
interface AuditObservation {
  origin: number;
  shell: number | null;
  primary: number | null;
  geometry: { time: number; parts: (Rectangle & { region: string })[] }[];
  scroll: { time: number; y: number }[];
  shifts: {
    time: number;
    value: number;
    recentInput: boolean;
    sources: { tag: string; previous: Rectangle; current: Rectangle }[];
  }[];
  longtasks: { time: number; duration: number }[];
  lcp: { time: number; size: number; tag: string }[];
  events: {
    time: number;
    duration: number;
    interaction: number;
    name: string;
  }[];
}
function observe(transition = false): void {
  const ResourceBufferSize = 5000;
  const EventThresholdMs = 16;
  performance.setResourceTimingBufferSize(ResourceBufferSize);
  globalThis.stopAudit?.();
  for (const observer of globalThis.auditObservers ?? []) {
    observer.disconnect();
  }
  globalThis.auditObservers = [];
  const origin = performance.now();
  let start = 0;
  if (transition) {
    start = origin;
  }
  globalThis.audit = {
    origin,
    shell: null,
    primary: null,
    geometry: [],
    scroll: [],
    shifts: [],
    longtasks: [],
    lcp: [],
    events: [],
  };
  let live = true;
  function scroll(): void {
    globalThis.audit.scroll.push({ time: performance.now(), y: scrollY });
  }
  globalThis.stopAudit = (): void => {
    live = false;
    globalThis.removeEventListener("scroll", scroll);
    for (const observer of globalThis.auditObservers ?? []) {
      observer.disconnect();
    }
  };
  globalThis.addEventListener("scroll", scroll, { passive: true });
  function watch(
    options: PerformanceObserverInit & { durationThreshold?: number },
    callback: PerformanceObserverCallback,
  ): void {
    const observer = new PerformanceObserver(callback);
    observer.observe(options);
    globalThis.auditObservers?.push(observer);
  }
  function isShift(entry: PerformanceEntry): entry is Shift {
    return (
      entry.entryType === "layout-shift" &&
      "value" in entry &&
      "sources" in entry
    );
  }
  function isInteraction(entry: PerformanceEntry): entry is Interaction {
    return entry.entryType === "event" && "interactionId" in entry;
  }
  function isPaint(entry: PerformanceEntry): entry is LargestPaint {
    return entry.entryType === "largest-contentful-paint" && "size" in entry;
  }
  function rectangle(rect: DOMRectReadOnly): Rectangle {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  watch({ type: "layout-shift", buffered: true }, (list) => {
    for (const entry of list.getEntries()) {
      if (isShift(entry) && entry.startTime >= start) {
        globalThis.audit.shifts.push({
          time: entry.startTime,
          value: entry.value,
          recentInput: entry.hadRecentInput,
          sources: entry.sources.map((source) => {
            let tag = "UNKNOWN";
            if (source.node instanceof Element) {
              tag = source.node.tagName.toUpperCase();
            }
            return {
              tag,
              previous: rectangle(source.previousRect),
              current: rectangle(source.currentRect),
            };
          }),
        });
      }
    }
  });
  watch({ type: "longtask", buffered: true }, (list) => {
    for (const entry of list.getEntries()) {
      if (entry.startTime >= start) {
        globalThis.audit.longtasks.push({
          time: entry.startTime,
          duration: entry.duration,
        });
      }
    }
  });
  watch({ type: "largest-contentful-paint", buffered: true }, (list) => {
    for (const entry of list.getEntries()) {
      if (isPaint(entry) && entry.startTime >= start) {
        globalThis.audit.lcp.push({
          time: entry.startTime,
          size: entry.size,
          tag: entry.element?.tagName.toUpperCase() ?? "UNKNOWN",
        });
      }
    }
  });
  watch(
    { type: "event", durationThreshold: EventThresholdMs, buffered: true },
    (list) => {
      for (const entry of list.getEntries()) {
        if (isInteraction(entry) && entry.startTime >= start) {
          globalThis.audit.events.push({
            time: entry.startTime,
            duration: entry.duration,
            interaction: entry.interactionId,
            name: entry.name,
          });
        }
      }
    },
  );
  let previous = "";
  function frame(): void {
    if (!live) {
      return;
    }
    const time = performance.now();
    const header = document.querySelector("body > header");
    if (globalThis.audit.shell === null && header?.querySelector("a")) {
      globalThis.audit.shell = time;
    }
    const parts: (Rectangle & { region: string })[] = [];
    const surfaces: [string, Element | null][] = [
      ["header", header],
      ["main", document.querySelector("main")],
      ["column", document.querySelector("main > .page-column")],
    ];
    for (const input of document.querySelectorAll("main textarea")) {
      surfaces.push(["input", input]);
    }
    for (const [region, node] of surfaces) {
      if (node !== null) {
        const rect = rectangle(node.getBoundingClientRect());
        // Every content rectangle uses document coordinates; scroll is independent.
        rect.y += scrollY;
        parts.push({ region, ...rect });
      }
    }
    const fingerprint = JSON.stringify(parts);
    if (fingerprint !== previous) {
      previous = fingerprint;
      globalThis.audit.geometry.push({ time, parts });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function primaryPresent(name: string): boolean {
  if (
    Array.from(document.querySelectorAll("[aria-busy]")).some(
      (node) => node.getAttribute("aria-busy") === "true",
    )
  ) {
    return false;
  }
  if (name === "home") {
    return document.querySelector('main a[href="/projects"]') !== null;
  }
  if (name === "editor") {
    return document.querySelector('textarea[name="prompt"]') !== null;
  }
  if (name === "long-adventure") {
    return document.querySelector('textarea[aria-label="Message"]') !== null;
  }
  if (name === "quests") {
    return document.querySelector("[role=tab]") !== null;
  }
  return document.querySelector('main button[aria-haspopup="dialog"]') !== null;
}

// What a state's own content must show, named by its check. Serializable so
// the browser evaluates it; the result is a boolean, never the content.
type StateContent =
  | { check: "fixture-link"; href: string }
  | { check: "message-count"; label: string; count: number }
  | { check: "no-owned-entities" }
  | { check: "built-in-activities-only" }
  | { check: "edited-prompt"; ending: string };
function statePresent(expected: StateContent): boolean {
  const IdLength = 36;
  function owned(href: string): boolean {
    const [root, kind, id, ...rest] = href.split("/");
    return (
      root === "" &&
      (kind === "projects" || kind === "chats") &&
      id?.length === IdLength &&
      rest.length === 0
    );
  }
  const links = Array.from(document.querySelectorAll("main a[href]"));
  if (expected.check === "fixture-link") {
    return links.some((link) => link.getAttribute("href") === expected.href);
  }
  if (expected.check === "message-count") {
    const list = Array.from(document.querySelectorAll("ol[aria-label]")).find(
      (node) => node.getAttribute("aria-label") === expected.label,
    );
    return list !== undefined && list.children.length === expected.count;
  }
  if (expected.check === "no-owned-entities") {
    return !links.some((link) => owned(link.getAttribute("href") ?? ""));
  }
  if (expected.check === "built-in-activities-only") {
    // Built-in cards offer a new-adventure dialog; only own ones link to
    // their editor.
    return (
      document.querySelector('main button[aria-haspopup="dialog"]') !== null &&
      !links.some((link) =>
        (link.getAttribute("href") ?? "").startsWith("/activities/"),
      )
    );
  }
  const prompt = document.querySelector('textarea[name="prompt"]');
  return (
    prompt instanceof HTMLTextAreaElement &&
    prompt.value.trimEnd().endsWith(expected.ending)
  );
}

export type { AuditObservation, StateContent };
export { observe, primaryPresent, statePresent };
