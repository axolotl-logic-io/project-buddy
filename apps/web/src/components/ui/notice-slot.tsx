"use client";

import {
  type JSX,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";

// Keeps an element at the tallest it has been at its current width since
// fresh last changed. A change in it is measured as the browser applies
// it, before the next paint, so the shorter layout never shows.
function useHeldRoom(fresh: string): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const mostRef = useRef(0);
  const holdRef = useRef<() => void>(() => undefined);
  const freshRef = useRef(fresh);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    let width = -1;
    const observer = new MutationObserver(measure);
    function measure(): void {
      if (element === null) {
        return;
      }
      element.style.minBlockSize = "";
      const natural = element.getBoundingClientRect();
      if (natural.width !== width) {
        ({ width } = natural);
        mostRef.current = 0;
      }
      mostRef.current = Math.max(mostRef.current, natural.height);
      element.style.minBlockSize = `${mostRef.current}px`;
      // The slot's own style changed just now, which is no change to hold.
      observer.takeRecords();
    }
    holdRef.current = measure;
    measure();
    observer.observe(element, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    return (): void => observer.disconnect();
  }, []);
  // The content the user asked for, such as a search's matches, takes the
  // room it needs.
  useLayoutEffect(() => {
    if (freshRef.current !== fresh) {
      freshRef.current = fresh;
      mostRef.current = 0;
      holdRef.current();
    }
  }, [fresh]);
  return ref;
}

// Where feedback shows once the page has loaded: the notices a part of the
// page gives after an action (an Alert for a problem, FormStatus for a
// result), together with the content around them that they replace, such
// as the form that saved or the list item that left. The slot keeps the
// most room its content has taken since the page opened, or since fresh
// changed, so when a notice takes the place of content that leaves at the
// same moment, or goes away, nothing after the slot moves. Its content
// keeps the spacing of the column around it.
function NoticeSlot({
  fresh = "",
  children,
}: {
  // Changes when the user asks for other content, such as by searching, so
  // the slot takes only the room that content needs.
  readonly fresh?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const ref = useHeldRoom(fresh);
  return (
    <div className="notice-slot" ref={ref}>
      {children}
    </div>
  );
}

export { NoticeSlot };
