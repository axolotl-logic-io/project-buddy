import { Slot } from "radix-ui";
import type { ComponentProps, JSX } from "react";

// How much a button stands out: the page's or form's main action, another
// action beside it, or a small action inside a list or form.
type ButtonVariant = "primary" | "secondary" | "quiet";

const VARIANT_ROLES: Readonly<Record<ButtonVariant, string>> = {
  primary: "button-primary",
  secondary: "button-secondary",
  quiet: "button-quiet",
};

type ButtonProps = ComponentProps<"button"> & {
  readonly variant?: ButtonVariant;
  // Style the one child element (such as a Link) as the button, instead of
  // rendering a <button>: a link that looks like a button stays a link.
  readonly asChild?: boolean;
};

// A button in one of the site's variants. It is type="button" unless told
// otherwise, so it never submits a form by accident. className adds layout
// utilities (such as self-start); the look comes from the variant.
export function Button({
  variant = "primary",
  asChild,
  className = "",
  type = "button",
  ...props
}: ButtonProps): JSX.Element {
  const classes = `${VARIANT_ROLES[variant]} ${className}`;
  if (asChild === true) {
    return <Slot.Root className={classes} {...props} />;
  }
  return <button className={classes} type={type} {...props} />;
}
