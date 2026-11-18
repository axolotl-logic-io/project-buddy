import { vi } from "vitest";

// Waiting for a dialog's pop-in or a panel's slide to end, without knowing
// which element animates or what the animation is called. Only animations
// that end are waited for: a looping one, such as an ornament's shimmer or a
// working dot, never finishes, and a paused one finishes only when played,
// so waiting on either would hang the test until its own timeout.

// How long the site's entrance animations may take to end, with room for a
// slow test machine. Every one runs well under a second; one still running
// after this is stuck or new, and the wait fails naming it.
const SETTLE_TIMEOUT_MS = 3000;

// An animation that ends on its own: finite, and not paused.
function ends(animation: Animation): boolean {
  const endTime = animation.effect?.getComputedTiming().endTime;
  return (
    animation.playState !== "paused" &&
    typeof endTime === "number" &&
    Number.isFinite(endTime)
  );
}

// What to call an animation in a failure: its keyframes' name, the property
// it transitions, or its id.
function animationName(animation: Animation): string {
  if (animation instanceof CSSAnimation) {
    return animation.animationName;
  }
  if (animation instanceof CSSTransition) {
    return `transition of ${animation.transitionProperty}`;
  }
  return animation.id || "an unnamed animation";
}

// Every animation on `target` and everything inside it; the document's are
// all of the page's.
function animationsIn(target: Element | Document): Animation[] {
  if (target instanceof Document) {
    return target.getAnimations();
  }
  return target.getAnimations({ subtree: true });
}

// Once every animation on `target`, and on everything inside it, that ends
// has ended. `what` names the target in a failure, such as "The site panel".
async function animationsSettled(
  target: Element | Document,
  what: string,
): Promise<void> {
  // The first frame can expose the dialog before WebKit has applied its
  // entrance animation. Read animation state after a rendering update.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  await vi.waitFor(
    () => {
      const running = animationsIn(target)
        .filter((animation) => ends(animation))
        .filter(
          (animation) => animation.pending || animation.playState === "running",
        );
      if (running.length > 0) {
        throw new Error(
          `${what} is still animating: ${running.map(animationName).join(", ")}`,
        );
      }
    },
    { timeout: SETTLE_TIMEOUT_MS },
  );
}

export { animationsSettled };
