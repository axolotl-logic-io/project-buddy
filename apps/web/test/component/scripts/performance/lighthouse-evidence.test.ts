import { describe, expect, test } from "vitest";
import {
  validateLighthouseReports,
  verifiedNavigation,
  verifiedTimespan,
} from "../../../../scripts/performance/lighthouse-evidence.ts";
import {
  BASE,
  flowWitness,
  LIGHTHOUSE_VERSION,
  lighthouseResult,
  navigationWitness,
} from "../../../support/performance/audit-records.ts";

const HOME = `${BASE}/home`;
const QUESTS = `${BASE}/projects`;
const CHAT = `${BASE}/chats/0a6c3b1e-3a3a-4b4b-8c8c-1d1d1d1d1d1d`;
const SAMPLES = 3;

function navigation(
  sample: number,
  path: "/home" | "/chats/:id",
): ReturnType<typeof verifiedNavigation> {
  let url = HOME;
  if (path === "/chats/:id") {
    url = CHAT;
  }
  return verifiedNavigation(
    lighthouseResult("navigation", url),
    navigationWitness(url),
    { sample, path, content: "fixture-link" },
  );
}
function timespan(sample: number): ReturnType<typeof verifiedTimespan> {
  return verifiedTimespan(
    lighthouseResult("timespan", QUESTS),
    flowWitness(QUESTS),
    { sample, content: "fixture-link" },
  );
}
function reports(): {
  navigations: ReturnType<typeof verifiedNavigation>[];
  flows: ReturnType<typeof verifiedTimespan>[];
} {
  const navigations: ReturnType<typeof verifiedNavigation>[] = [];
  const flows: ReturnType<typeof verifiedTimespan>[] = [];
  for (let sample = 1; sample <= SAMPLES; sample += 1) {
    navigations.push(
      navigation(sample, "/home"),
      navigation(sample, "/chats/:id"),
    );
    flows.push(timespan(sample));
  }
  return { navigations, flows };
}

describe("a Lighthouse navigation is evidence only for the tab it audited", () => {
  test("keeps a navigation of the checked tab with its content", () => {
    expect(navigation(1, "/home")).toEqual(
      expect.objectContaining({
        path: "/home",
        verification: {
          auditedTab: "same-page",
          navigatedDuringAudit: true,
          content: "fixture-link",
        },
      }),
    );
  });

  test("rejects a runner that audited another tab or left this one", () => {
    const record = {
      sample: 1,
      path: "/home",
      content: "fixture-link",
    } as const;
    for (const witness of [
      { ...navigationWitness(HOME), auditedTimeOrigin: 1000 },
      { ...navigationWitness(HOME), mainFrameUrls: [] },
      { ...navigationWitness(HOME), checkedTimeOrigin: 3000 },
    ]) {
      expect(() =>
        verifiedNavigation(
          lighthouseResult("navigation", HOME),
          witness,
          record,
        ),
      ).toThrow("Lighthouse did not navigate the checked tab");
    }
  });

  test("rejects a signed-out redirect and an audited page without its content", () => {
    const record = {
      sample: 1,
      path: "/home",
      content: "fixture-link",
    } as const;
    const login = `${BASE}/login`;
    expect(() =>
      verifiedNavigation(
        { ...lighthouseResult("navigation", HOME), finalDisplayedUrl: login },
        { ...navigationWitness(HOME), pageUrl: login },
        record,
      ),
    ).toThrow("Lighthouse redirected or audited another address");
    expect(() =>
      verifiedNavigation(
        lighthouseResult("navigation", HOME),
        { ...navigationWitness(HOME), content: false },
        record,
      ),
    ).toThrow("Audited document lacks its authenticated content");
  });

  test("rejects runtime errors, warnings and errored audits", () => {
    const record = {
      sample: 1,
      path: "/home",
      content: "fixture-link",
    } as const;
    const result = lighthouseResult("navigation", HOME);
    for (const failed of [
      { ...result, runtimeError: { code: "NO_FCP" } },
      { ...result, runWarnings: ["The page loaded too slowly"] },
      {
        ...result,
        audits: { viewport: { score: null, scoreDisplayMode: "error" } },
      },
      { ...result, gatherMode: "snapshot" },
    ]) {
      expect(() =>
        verifiedNavigation(failed, navigationWitness(HOME), record),
      ).toThrow("Lighthouse audit failed or warned");
    }
    expect(() =>
      verifiedNavigation(undefined, navigationWitness(HOME), record),
    ).toThrow();
  });
});

describe("a Lighthouse timespan measures only the transition", () => {
  test("rejects emulation applied inside the timespan", () => {
    expect(() =>
      verifiedTimespan(
        lighthouseResult("timespan", QUESTS),
        { ...flowWitness(QUESTS), viewportBeforeTimespan: "800x600@1" },
        { sample: 1, content: "fixture-link" },
      ),
    ).toThrow("Lighthouse changed emulation inside the timespan");
  });

  test("rejects a document navigation or missing destination content", () => {
    for (const witness of [
      { ...flowWitness(QUESTS), destinationTimeOrigin: 3000 },
      { ...flowWitness(QUESTS), content: false },
      { ...flowWitness(QUESTS), pageUrl: `${BASE}/login` },
    ]) {
      expect(() =>
        verifiedTimespan(lighthouseResult("timespan", QUESTS), witness, {
          sample: 1,
          content: "fixture-link",
        }),
      ).toThrow("Lighthouse flow left the source document");
    }
  });
});

describe("retained Lighthouse reports", () => {
  test("accept every sample's verified navigations and timespan", () => {
    const { navigations, flows } = reports();
    expect(() =>
      validateLighthouseReports(
        navigations,
        flows,
        SAMPLES,
        LIGHTHOUSE_VERSION,
      ),
    ).not.toThrow();
  });

  test("reject missing, duplicated, unverified or other-version reports", () => {
    const { navigations, flows } = reports();
    const [first, ...rest] = navigations;
    expect(() =>
      validateLighthouseReports(rest, flows, SAMPLES, LIGHTHOUSE_VERSION),
    ).toThrow();
    expect(() =>
      validateLighthouseReports(
        [first, first, ...rest],
        flows,
        SAMPLES,
        LIGHTHOUSE_VERSION,
      ),
    ).toThrow();
    expect(() =>
      validateLighthouseReports(
        [...rest, navigation(1, "/chats/:id")],
        flows,
        SAMPLES,
        LIGHTHOUSE_VERSION,
      ),
    ).toThrow("Incomplete Lighthouse reports");
    expect(() =>
      validateLighthouseReports(
        navigations.map((report) => ({ ...report, verification: undefined })),
        flows,
        SAMPLES,
        LIGHTHOUSE_VERSION,
      ),
    ).toThrow();
    expect(() =>
      validateLighthouseReports(
        navigations.map((report) => ({ ...report, prompt: "private" })),
        flows,
        SAMPLES,
        LIGHTHOUSE_VERSION,
      ),
    ).toThrow();
    expect(() =>
      validateLighthouseReports(navigations, flows, SAMPLES, "12.8.3"),
    ).toThrow("Lighthouse version differs from the manifest");
  });
});
