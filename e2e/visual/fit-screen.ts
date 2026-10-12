// Fits the screen to the page before a visual test's full-page shot. The
// screen is made as tall as the page, so that the whole page is on screen: a
// sticky part, such as the chat's composer, then sits where it does at the
// end of a scroll, not over the page's middle, and parts drawn only once
// they are on screen are drawn.
import type { Page } from "@playwright/test";

interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

// One try at fitting the screen: the page's settled height at the shot's own
// screen size, the screen height that fits it, and the page's settled height
// on that screen.
interface Fit {
  readonly pageHeight: number;
  readonly screenHeight: number;
  readonly fittedHeight: number;
}

// How many tries fitScreenToPage makes before it gives up.
const FIT_TRIES = 5;

// The page's height once it is the same on two animation frames in a row.
async function settledPageHeight(page: Page): Promise<number> {
  return await page.evaluate(async (): Promise<number> => {
    function heightNextFrame(): Promise<number> {
      return new Promise((resolve): void => {
        requestAnimationFrame((): void => {
          resolve(document.documentElement.scrollHeight);
        });
      });
    }
    async function heightThatHolds(last: number): Promise<number> {
      const height = await heightNextFrame();
      if (height === last) {
        return height;
      }
      return await heightThatHolds(height);
    }
    return await heightThatHolds(await heightNextFrame());
  });
}

async function tryFit(page: Page, screen: ScreenSize): Promise<Fit> {
  await page.setViewportSize(screen);
  const pageHeight = await settledPageHeight(page);
  const screenHeight = Math.max(screen.height, pageHeight);
  await page.setViewportSize({ width: screen.width, height: screenHeight });
  return {
    pageHeight,
    screenHeight,
    fittedHeight: await settledPageHeight(page),
  };
}

// Whether the latest try fits for good: the page stayed as tall as the
// screen, and its height at the shot's own screen size is the one the try
// before it found, so nothing was still changing.
function fitsForGood(tries: readonly Fit[]): boolean {
  const fit = tries.at(-1);
  const before = tries.at(-2);
  return (
    fit !== undefined &&
    fit.fittedHeight === fit.screenHeight &&
    fit.pageHeight === before?.pageHeight
  );
}

async function fitUntilSettled(
  page: Page,
  screen: ScreenSize,
  tries: readonly Fit[],
): Promise<void> {
  const triesNow = [...tries, await tryFit(page, screen)];
  if (fitsForGood(triesNow)) {
    return;
  }
  if (triesNow.length >= FIT_TRIES) {
    throw new Error(
      `The page's height never settled: ${JSON.stringify(triesNow)}`,
    );
  }
  await fitUntilSettled(page, screen, triesNow);
}

// Fits the screen to the page. A page's height can change once the screen
// does, so each height is read only once it holds, and the fit is tried
// again until two tries in a row agree and the page stays as tall as the
// screen: a page that grew would be cut off, and one that shrank would leave
// a blank band. Two parts of the chat page change:
// - a code block in a reply (Streamdown's, `content-visibility: auto`) keeps
//   a 200 px stand-in height until it has been on screen once, so the page
//   shrinks when the taller screen first shows it, and a block the thread
//   happened to scroll past while it streamed doesn't; and
// - the message box (react-textarea-autosize) is sometimes 1 px too tall
//   until a resize makes it measure itself again.
async function fitScreenToPage(page: Page): Promise<void> {
  const screen = page.viewportSize();
  if (screen === null) {
    throw new Error("The visual tests need a fixed viewport");
  }
  await fitUntilSettled(page, screen, []);
}

export { fitScreenToPage };
