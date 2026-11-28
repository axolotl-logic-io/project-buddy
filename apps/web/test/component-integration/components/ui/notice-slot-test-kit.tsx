import type { JSX } from "react";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { NoticeSlot } from "@/components/ui/notice-slot.tsx";

const FORM_LINES: readonly string[] = [
  "Amount",
  "How many to add",
  "Save",
  "Cancel",
];

// A part of a page with a form that saving closes, its notice, and what
// comes after them, which reads after.
function SlotPart({
  form,
  status,
  fresh,
  after,
}: {
  readonly form: boolean;
  readonly after: string;
  readonly status: string | undefined;
  readonly fresh?: string;
}): JSX.Element {
  let content: JSX.Element | undefined;
  if (form) {
    content = (
      <div>
        {FORM_LINES.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <NoticeSlot fresh={fresh ?? ""}>
        {content}
        <FormStatus>{status}</FormStatus>
      </NoticeSlot>
      <p>{after}</p>
    </div>
  );
}

export { SlotPart };
