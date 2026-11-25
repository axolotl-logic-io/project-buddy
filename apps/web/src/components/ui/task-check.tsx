import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";

// A task's checkbox: the same square as a streak's day on Home, filled and
// checked when the task is checked off. The native checkbox covers the
// whole target, unseen, so it keeps its role, label and keyboard use. id
// lets a <label> around the task's text name it.
function TaskCheck({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}: {
  readonly id?: string;
  readonly checked: boolean;
  readonly onChange: (() => void) | undefined;
  readonly label?: string | undefined;
  readonly disabled?: boolean;
}): JSX.Element {
  let mark: JSX.Element | undefined;
  if (checked) {
    mark = <Icon name="check" />;
  }
  return (
    <span className="task-check">
      <input
        aria-label={label}
        checked={checked}
        disabled={disabled}
        id={id}
        onChange={onChange}
        type="checkbox"
      />
      <span className="check-square" data-checked={checked}>
        {mark}
      </span>
    </span>
  );
}

export { TaskCheck };
