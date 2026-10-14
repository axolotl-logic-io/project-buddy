import type { JSX } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { TIME_SLOT, type TimeDetail } from "@/components/time-format.ts";

// A copy text with TIME_SLOT in it, shown with the time in the browser's
// zone (LocalTime) in the slot's place.
function CopyWithTime({
  text,
  dateTime,
  detail,
}: {
  readonly text: string;
  readonly dateTime: Date;
  readonly detail: TimeDetail;
}): JSX.Element {
  const [before = "", after = ""] = text.split(TIME_SLOT);
  return (
    <>
      {before}
      <LocalTime dateTime={dateTime} detail={detail} />
      {after}
    </>
  );
}

export { CopyWithTime };
