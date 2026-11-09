import type { JSX, ReactNode, Ref } from "react";
import { Icon } from "@/components/ui/icon.tsx";

// What went wrong, such as with a form, one of its fields or a chat's reply.
// It is an alert, so a screen reader reads it as soon as it appears. A field
// names it by id in aria-describedby (see field.tsx) and keeps it inline.
// Page errors use the shared notice box, with an icon as well as error text.
function Alert({
  id,
  boxed,
  children,
}: {
  readonly id?: string;
  readonly boxed?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  let look = "notice error-text";
  if (id !== undefined && boxed !== true) {
    look = "error-text";
  }
  return (
    <p className={`${look} icon-line`} id={id} role="alert">
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  );
}

// Page state is static by default. Callers opt into an announcement only for
// feedback, and can retain focus when the control that submitted it disappears.
function Notice({
  children,
  role,
  ref,
  tabIndex,
}: {
  readonly children?: ReactNode;
  readonly role?: "status" | "alert";
  readonly ref?: Ref<HTMLParagraphElement>;
  readonly tabIndex?: number;
}): JSX.Element {
  return (
    <p className="notice" role={role} ref={ref} tabIndex={tabIndex}>
      {children}
    </p>
  );
}

// Keep the live region mounted while empty; only visible feedback gets a box.
function FormStatus({
  children,
}: {
  readonly children?: ReactNode;
}): JSX.Element {
  return <Notice role="status">{children}</Notice>;
}

export { Alert, FormStatus, Notice };
