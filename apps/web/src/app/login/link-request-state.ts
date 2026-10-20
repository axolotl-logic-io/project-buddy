// What the sign-in and the sign-up forms' actions answer with, which the
// form (link-request-form.tsx) shows. The browser imports this module.

// The form's state: as first shown; after a request was taken, whether or
// not a link was sent; after a field held something wrong, named by field;
// or after a failure such as the storage being unreachable, or a lockout.
// email is the address she typed, shown again, since React clears the form
// once the action ends.
type LinkRequestState =
  | { readonly kind: "idle" }
  | { readonly kind: "sent"; readonly message: string; readonly email: string }
  | {
      readonly kind: "invalid";
      readonly field: "email";
      readonly message: string;
      readonly email: string;
    }
  | {
      readonly kind: "error";
      readonly message: string;
      readonly email: string;
    };

const IDLE: LinkRequestState = { kind: "idle" };

export type { LinkRequestState };
export { IDLE };
