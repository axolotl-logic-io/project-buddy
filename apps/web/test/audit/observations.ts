import type { Locator, Page } from "@playwright/test";
import type { CDPSession } from "puppeteer-core";

const MS_PER_SECOND = 1000;
const WINDOW_MS = 5000;

interface Window {
  readonly start: number;
  readonly end: number;
}

type Numbers = Record<string, number>;

async function recordNetwork(session: CDPSession): Promise<{
  readonly bytes: (window: Window) => Numbers;
  readonly clear: () => void;
}> {
  const requests = new Map<
    string,
    { wallOffset: number; prefetch: boolean; type?: string }
  >();
  const transfers: { end: number; bytes: number; kind: string }[] = [];
  session.on("Network.requestWillBeSent", (event) => {
    const headers = Object.entries(event.request.headers).map(
      ([name, value]): [string, unknown] => [name.toLowerCase(), value],
    );
    const prefetch = headers.some(
      ([name, value]) =>
        name === "next-router-prefetch" ||
        name === "next-router-segment-prefetch" ||
        ((name === "purpose" || name === "sec-purpose") &&
          typeof value === "string" &&
          value.includes("prefetch")),
    );
    requests.set(event.requestId, {
      wallOffset: event.wallTime - event.timestamp,
      prefetch: prefetch || event.type === "Prefetch",
    });
  });
  session.on("Network.responseReceived", ({ requestId, type }) => {
    const request = requests.get(requestId);
    if (request !== undefined) {
      request.type = type;
    }
  });
  session.on("Network.loadingFailed", ({ requestId }) =>
    requests.delete(requestId),
  );
  session.on(
    "Network.loadingFinished",
    ({ requestId, timestamp, encodedDataLength }) => {
      const request = requests.get(requestId);
      requests.delete(requestId);
      if (request === undefined) {
        return;
      }
      let kind = request.type;
      if (request.prefetch || kind === "Prefetch") {
        kind = "prefetch";
      }
      if (kind !== undefined) {
        transfers.push({
          end: (timestamp + request.wallOffset) * MS_PER_SECOND,
          bytes: encodedDataLength,
          kind,
        });
      }
    },
  );
  await session.send("Network.enable");

  return {
    bytes: ({ start, end }: Window): Numbers => {
      const totals = new Map<string, number>();
      for (const transfer of transfers) {
        if (transfer.end >= start && transfer.end <= end) {
          totals.set(
            transfer.kind,
            (totals.get(transfer.kind) ?? 0) + transfer.bytes,
          );
        }
      }
      return {
        jsBytes: totals.get("Script") ?? 0,
        fontBytes: totals.get("Font") ?? 0,
        imageBytes: totals.get("Image") ?? 0,
        prefetchBytes: totals.get("prefetch") ?? 0,
      };
    },
    clear: (): void => {
      transfers.length = 0;
      requests.clear();
    },
  };
}

// Observe completed transfers through the end of the measured window.
async function loadWindow(page: Page): Promise<Window> {
  return await page.evaluate(
    async (duration) =>
      await new Promise<Window>((resolve) => {
        function frame(): void {
          if (performance.now() < duration) {
            requestAnimationFrame(frame);
          } else {
            resolve({
              start: performance.timeOrigin,
              end: performance.timeOrigin + duration,
            });
          }
        }
        requestAnimationFrame(frame);
      }),
    WINDOW_MS,
  );
}

interface ActionWindow extends Window {
  readonly numbers: Numbers;
}

interface ActionObserver {
  readonly finish: (url: string) => Promise<ActionWindow>;
  readonly viewportChanged: () => Promise<boolean>;
  readonly close: () => Promise<void>;
}

// Capture rendered main content at frame boundaries. A click that navigates
// to a new document discards this observer and cannot pass as an in-app swap.
async function observePageChange(
  target: Locator,
  label: string,
): Promise<ActionObserver> {
  const observer = await target.evaluateHandle(
    (link, { trailLabel, duration }) => {
      function main(): string {
        return document.querySelector("main")?.innerText ?? "";
      }
      function viewport(): string {
        return `${innerWidth}x${innerHeight}/${visualViewport?.width}x${visualViewport?.height}`;
      }
      const initialViewport = viewport();
      let viewportChanged = false;
      function resize(): void {
        if (initialViewport !== viewport()) {
          viewportChanged = true;
        }
      }
      window.addEventListener("resize", resize);
      visualViewport?.addEventListener("resize", resize);

      const shifts: number[] = [];
      const shiftObserver = new PerformanceObserver((event) => {
        shifts.push(...event.getEntries().map(({ startTime }) => startTime));
      });
      shiftObserver.observe({ type: "layout-shift" });

      const frames: {
        text: string;
        url: string;
        busy: boolean;
        time: number;
      }[] = [];
      let start: number | undefined;
      let frameId = 0;
      let feedbackMs: number | undefined;
      let feedbackFrame = false;
      const initialText = main();

      function frame(): void {
        const time = performance.now();
        const trail = document.querySelector(`[aria-label="${trailLabel}"]`);
        const busy = trail?.getAttribute("aria-busy") === "true";
        if (start !== undefined) {
          if (feedbackFrame && feedbackMs === undefined) {
            feedbackMs = time - start;
          }
          feedbackFrame =
            busy &&
            Boolean(trail?.querySelector("[role=status]")?.textContent?.trim());
        }
        const text = main();
        const url = location.href;
        const last = frames.at(-1);
        if (last?.text !== text || last.url !== url || last.busy !== busy) {
          frames.push({ text, url, busy, time });
        }
        resize();
        frameId = requestAnimationFrame(frame);
      }

      function click(event: Event): void {
        start = event.timeStamp;
        frameId = requestAnimationFrame(frame);
      }

      link.addEventListener("click", click, { capture: true, once: true });

      return {
        viewportChanged: (): boolean =>
          viewportChanged || initialViewport !== viewport(),
        close: (): void => {
          link.removeEventListener("click", click, true);
          window.removeEventListener("resize", resize);
          visualViewport?.removeEventListener("resize", resize);
          shiftObserver.disconnect();
          cancelAnimationFrame(frameId);
        },
        finish: async (url: string): Promise<ActionWindow> => {
          if (start === undefined) {
            throw new Error(
              "page change check: the audited link received no click",
            );
          }
          const clickedAt: number = start;
          const end = clickedAt + duration;
          const destination = main();
          return await new Promise<ActionWindow>((resolve) => {
            function finish(): void {
              if (performance.now() < end) {
                requestAnimationFrame(finish);
                return;
              }
              const swap = frames.find(
                ({ text, url: address, busy }) =>
                  address === url && text === destination && !busy,
              );
              let changes = 0;
              let shown = initialText;
              for (const { text } of frames) {
                if (text !== shown) {
                  shown = text;
                  changes += 1;
                }
              }
              const pendingShifts = shiftObserver
                .takeRecords()
                .map(({ startTime }) => startTime);
              const numbers: Numbers = {
                mainSwaps: changes,
                singleSwap: Number(
                  changes === 1 && shown === destination && swap !== undefined,
                ),
                layoutShifts: [...shifts, ...pendingShifts].filter(
                  (time) =>
                    time >= clickedAt &&
                    time <= Math.max(end, swap?.time ?? end),
                ).length,
              };
              if (swap !== undefined) {
                Object.assign(numbers, { swapMs: swap.time - clickedAt });
              }
              if (feedbackMs !== undefined) {
                Object.assign(numbers, { feedbackMs });
              }
              resolve({
                start: performance.timeOrigin + clickedAt,
                end: performance.timeOrigin + end,
                numbers,
              });
            }
            requestAnimationFrame(finish);
          });
        },
      };
    },
    { trailLabel: label, duration: WINDOW_MS },
  );

  return {
    finish: async (address: string): Promise<ActionWindow> =>
      await observer.evaluate((probe, url) => probe.finish(url), address),
    viewportChanged: async (): Promise<boolean> =>
      await observer.evaluate((probe) => probe.viewportChanged()),
    close: async (): Promise<void> => {
      await observer.evaluate((probe) => probe.close());
      await observer.dispose();
    },
  };
}

export type { Numbers };
export { loadWindow, observePageChange, recordNetwork };
