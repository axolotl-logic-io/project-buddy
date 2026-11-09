"use client";

import { useAui } from "@assistant-ui/react";
import { type RefObject, useLayoutEffect, useRef } from "react";

// Page scrolling belongs here: assistant-ui's viewport follows only its own
// scroll container, whereas this chat shares the document with its header.
// All moves are instant, including for users who request reduced motion.
function useChatScroll(): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement>(null);
  const runtime = useAui();

  useLayoutEffect(() => {
    const element = rootRef.current;
    if (element === null) {
      return;
    }
    let following = true;
    let lastY = window.scrollY;
    const viewport = window.visualViewport;
    let lastHeight = window.innerHeight;
    let lastInset = -1;
    let resizeFrame = 0;
    let navigation = 0;
    let resizeNavigation = 0;
    // Input intent remains active until the document actually moves.
    let pendingNavigation = false;
    // Input can suspend follow before a scroll exists. Focus must not grant
    // permission to resume it; only navigation back down or sending can.
    let resumeBlocked = false;
    let touchY: number | undefined;

    function navigate(upward: boolean): void {
      if (upward && window.scrollY <= 0) {
        return;
      }
      navigation += 1;
      pendingNavigation = true;
      if (upward) {
        following = false;
        resumeBlocked = true;
      } else {
        resumeBlocked = false;
      }
    }

    function onWheel(event: WheelEvent): void {
      if (!event.ctrlKey && event.deltaY !== 0) {
        navigate(event.deltaY < 0);
      }
    }

    function onFocusIn(): void {
      if (!following) {
        resumeBlocked = true;
      }
    }

    function onPointerDown(event: PointerEvent): void {
      // Native scrollbar input targets the document, outside the thread.
      if (event.target === document.documentElement) {
        navigate(false);
      }
    }

    function onClick(event: MouseEvent): void {
      if (
        event.target instanceof Element &&
        event.target.closest("a[href]") !== null
      ) {
        navigate(false);
      }
    }

    function onTouchStart(event: TouchEvent): void {
      touchY = event.touches[0]?.clientY;
    }

    function onTouchMove(event: TouchEvent): void {
      const y = event.touches[0]?.clientY;
      if (y !== undefined && touchY !== undefined && y !== touchY) {
        navigate(y > touchY);
      }
      touchY = y;
    }

    function onKeyDown(event: KeyboardEvent): void {
      // Editing and control shortcuts do not navigate the document.
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof Element &&
          (event.target.closest("input, textarea, select") !== null ||
            (event.target instanceof HTMLElement &&
              event.target.isContentEditable)))
      ) {
        return;
      }
      if (
        event.key === "ArrowUp" ||
        event.key === "PageUp" ||
        event.key === "Home" ||
        (event.key === " " && event.shiftKey)
      ) {
        navigate(true);
      } else if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === "End" ||
        event.key === " "
      ) {
        navigate(false);
      }
    }

    function atBottom(): boolean {
      return (
        document.documentElement.scrollHeight -
          window.innerHeight -
          window.scrollY <=
        1
      );
    }

    function follow(): void {
      // Scroll events can arrive after a resize observer. Notice an actual
      // upward move here too (scrollbar dragging and navigation links).
      // Shrinking content can clamp Y upward while still at the bottom.
      if (window.scrollY < lastY && !atBottom() && resizeFrame === 0) {
        following = false;
      }
      if (following) {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant",
        });
        lastY = window.scrollY;
      }
    }

    function onScroll(): void {
      // A focused textarea can make the browser scroll when its keyboard
      // resizes the window. That is not a request to leave the reading spot.
      if (
        (resizeFrame !== 0 || window.innerHeight !== lastHeight) &&
        navigation === resizeNavigation &&
        !pendingNavigation
      ) {
        return;
      }
      const y = window.scrollY;
      if (y !== lastY) {
        pendingNavigation = false;
      }
      if (y < lastY && !atBottom()) {
        following = false;
        resumeBlocked = false;
      } else if (y > lastY && atBottom() && !resumeBlocked) {
        following = true;
      }
      lastY = y;
    }

    function onResize(): void {
      // Safari can shrink only the visual viewport when the keyboard opens.
      // Reserve that covered space and raise the existing sticky composer.
      let inset = 0;
      if (viewport !== null) {
        inset = Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
        );
      }
      // Firefox's asynchronous wheel scrolling fires a visual viewport
      // scroll on each step, its offsetTop off by a fraction of a pixel.
      // Nothing was resized, so the user's scrolling must not be undone.
      if (inset === lastInset && window.innerHeight === lastHeight) {
        return;
      }
      lastInset = inset;
      element?.style.setProperty("--chat-keyboard-inset", `${inset}px`);
      cancelAnimationFrame(resizeFrame);
      resizeNavigation = navigation;
      // Restore after the browser applies its own focus/scroll anchoring for
      // the resized viewport, before recording further user scrolling.
      resizeFrame = requestAnimationFrame((): void => {
        if (
          !(following || pendingNavigation) &&
          navigation === resizeNavigation
        ) {
          window.scrollTo({ top: lastY, behavior: "instant" });
        }
        lastHeight = window.innerHeight;
        lastY = window.scrollY;
        resizeFrame = 0;
        follow();
      });
    }

    function onSend(): void {
      following = true;
      pendingNavigation = false;
      resumeBlocked = false;
      lastY = window.scrollY;
      follow();
    }

    const unsubscribe = runtime.on("composer.send", onSend);
    const observer = new ResizeObserver(follow);
    observer.observe(element);
    element.addEventListener("focusin", onFocusIn);
    globalThis.addEventListener("pointerdown", onPointerDown);
    globalThis.addEventListener("click", onClick, { capture: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    globalThis.addEventListener("touchstart", onTouchStart, { passive: true });
    globalThis.addEventListener("touchmove", onTouchMove, { passive: true });
    globalThis.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    viewport?.addEventListener("resize", onResize);
    viewport?.addEventListener("scroll", onResize);
    onResize();
    return (): void => {
      cancelAnimationFrame(resizeFrame);
      unsubscribe();
      observer.disconnect();
      element.removeEventListener("focusin", onFocusIn);
      globalThis.removeEventListener("pointerdown", onPointerDown);
      globalThis.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("wheel", onWheel);
      globalThis.removeEventListener("touchstart", onTouchStart);
      globalThis.removeEventListener("touchmove", onTouchMove);
      globalThis.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      viewport?.removeEventListener("resize", onResize);
      viewport?.removeEventListener("scroll", onResize);
    };
  }, [runtime]);

  return rootRef;
}

export { useChatScroll };
