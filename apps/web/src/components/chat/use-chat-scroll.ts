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
    let resizeFrame = 0;

    function follow(): void {
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
      if (resizeFrame !== 0 || window.innerHeight !== lastHeight) {
        return;
      }
      const y = window.scrollY;
      const remaining =
        document.documentElement.scrollHeight - window.innerHeight - y;
      if (remaining <= 1) {
        following = true;
      } else if (y < lastY) {
        following = false;
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
          window.innerHeight - viewport.height - viewport.offsetTop,
        );
      }
      element?.style.setProperty("--chat-keyboard-inset", `${inset}px`);
      cancelAnimationFrame(resizeFrame);
      // Restore after the browser applies its own focus/scroll anchoring for
      // the resized viewport, before recording further user scrolling.
      resizeFrame = requestAnimationFrame((): void => {
        if (!following) {
          window.scrollTo({ top: lastY, behavior: "instant" });
        }
        lastHeight = window.innerHeight;
        resizeFrame = 0;
        follow();
      });
    }

    function onSend(): void {
      following = true;
      follow();
    }

    const unsubscribe = runtime.on("composer.send", onSend);
    const observer = new ResizeObserver(follow);
    observer.observe(element);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    viewport?.addEventListener("resize", onResize);
    viewport?.addEventListener("scroll", onResize);
    onResize();
    return (): void => {
      cancelAnimationFrame(resizeFrame);
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      viewport?.removeEventListener("resize", onResize);
      viewport?.removeEventListener("scroll", onResize);
    };
  }, [runtime]);

  return rootRef;
}

export { useChatScroll };
