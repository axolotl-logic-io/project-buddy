"use client";

import { type JSX, useEffect, useRef } from "react";
import { Notice } from "@/components/ui/form-message.tsx";

// The Forgotten tab's report of the change the user just made. It takes the
// focus as it appears, since the control that made the change has usually
// gone with its rite's card, and stays until the user moves on.
function RiteChangeNotice({
  message,
}: {
  readonly message: string;
}): JSX.Element {
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    noticeRef.current?.focus();
  }, []);
  return (
    <Notice role="status" tabIndex={-1} ref={noticeRef}>
      {message}
    </Notice>
  );
}

export { RiteChangeNotice };
