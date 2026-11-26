// Keeps focus in a group of tasks when the focused checkbox leaves with its
// task: on the next task's checkbox, else the one before it, else the
// fallback, such as the group's heading. Focus elsewhere stays where it is.
// Call it before the task leaves.
function keepFocus(
  group: HTMLElement | null,
  fallback: HTMLElement | null,
): void {
  const leaving = document.activeElement;
  if (group === null || !(leaving instanceof HTMLInputElement)) {
    return;
  }
  const checks = [...group.querySelectorAll("input")].filter(
    ({ type }) => type === "checkbox",
  );
  const at = checks.indexOf(leaving);
  if (at === -1) {
    return;
  }
  const next = checks[at + 1] ?? checks[at - 1] ?? fallback;
  next?.focus();
}

export { keepFocus };
