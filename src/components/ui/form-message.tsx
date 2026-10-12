import type { JSX, ReactNode } from "react";
import { AlertIcon } from "@/components/ui/icons.tsx";

// What went wrong with a form or one of its fields. It is an alert, so a
// screen reader reads it as soon as it appears. A field names it by id in
// aria-describedby (see field.tsx).
export function FormAlert({
  id,
  children,
}: {
  readonly id?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <p className="error-text flex items-start gap-1.5" id={id} role="alert">
      <AlertIcon />
      <span>{children}</span>
    </p>
  );
}

// What a form did, such as "Saved.", or nothing yet. It is always on the
// page, empty until there is news, so a screen reader announces each change.
export function FormStatus({
  children,
}: {
  readonly children?: ReactNode;
}): JSX.Element {
  return (
    <p className="status-text" role="status">
      {children}
    </p>
  );
}
