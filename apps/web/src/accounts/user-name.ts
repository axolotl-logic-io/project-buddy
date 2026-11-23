// The name the user goes by: one line of text, trimmed, short, with no
// braces, so a name never holds the {user} placeholder it fills in rite
// replies (riteReply in rite.ts). The browser imports this module, so it
// imports nothing server-only. The users table's users_name_normalized check
// holds the same rule.

// Sixty characters hold any name the user is likely to give, and the column's
// check refuses longer ones.
const USER_NAME_MAX_LENGTH = 60;

// Any line break, including Unicode's line and paragraph separators.
const LINE_BREAK = /[\r\n\u2028\u2029]/u;

const BRACE = /[{}]/u;

// Why a value is not a name once trimmed: it holds a line break, it is
// longer than USER_NAME_MAX_LENGTH, or it holds a brace. A name with more
// than one problem gets the first in this order.
type UserNameProblem = "multi-line" | "too-long" | "braces";

// What checkUserName found: a name, no name (the user cleared it), or why the
// value isn't one.
type UserNameCheck =
  | { readonly kind: "valid"; readonly name: string }
  | { readonly kind: "cleared" }
  | { readonly kind: "refused"; readonly problem: UserNameProblem };

// The value trimmed, as a name; cleared when nothing is left; or the reason
// it is refused.
function checkUserName(value: string): UserNameCheck {
  const name = value.trim();
  if (name === "") {
    return { kind: "cleared" };
  }
  if (LINE_BREAK.test(name)) {
    return { kind: "refused", problem: "multi-line" };
  }
  if (name.length > USER_NAME_MAX_LENGTH) {
    return { kind: "refused", problem: "too-long" };
  }
  if (BRACE.test(name)) {
    return { kind: "refused", problem: "braces" };
  }
  return { kind: "valid", name };
}

export type { UserNameProblem };
export { checkUserName, USER_NAME_MAX_LENGTH };
