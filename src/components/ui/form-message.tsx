import type { JSX, ReactNode } from "react";
import { Icon } from "@/components/ui/icon.tsx";

// What went wrong, such as with a form, one of its fields or a chat's reply.
// It is an alert, so a screen reader reads it as soon as it appears. A field
// names it by id in aria-describedby (see field.tsx). Boxed, it stands apart
// from what surrounds it, as in the chat's thread; otherwise it sits in line
// under what it is about.
function Alert({
  id,
  boxed,
  children,
}: {
  readonly id?: string;
  readonly boxed?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  let look = "error-text";
  if (boxed === true) {
    look = "error-text error-box";
  }
  return (
    <p className={`${look} flex items-start gap-2`} id={id} role="alert">
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  );
}

// What a form did, such as "Saved.", or nothing yet. It is always on the
// page, empty until there is news, so a screen reader announces each change.
function FormStatus({
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

// FormAlert is Alert's name from before the chat shared it; the forms outside
// src/components/ui/ still import it.
export { Alert, Alert as FormAlert, FormStatus };
