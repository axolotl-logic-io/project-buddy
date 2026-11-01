// An activity as a choice, for the buddy's list of activities, the forms
// that start a chat in one, and the control that changes a chat's activity:
// its id, its name and, for a built-in activity, what it is; never its
// parts, so it can be sent to the browser.

// An activity as a choice: its id, a built-in activity's or an own
// activity's, its name and, for a built-in activity, what it is.
interface ActivityChoice {
  readonly id: string;
  readonly name: string;
  readonly description: string | undefined;
}

export type { ActivityChoice };
