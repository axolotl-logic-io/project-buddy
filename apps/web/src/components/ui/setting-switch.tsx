"use client";

import { Switch } from "radix-ui";
import { type JSX, useId } from "react";

// A setting's switch on the Settings page: its label and hint, which are
// one target with the switch, at least 44px tall. A disabled switch shows
// its position but can't be changed, such as while a change is saving.
export function SettingSwitch({
  label,
  hint,
  on,
  disabled,
  onSwitch,
}: {
  readonly label: string;
  readonly hint: string;
  readonly on: boolean;
  readonly disabled?: boolean;
  readonly onSwitch: (on: boolean) => void;
}): JSX.Element {
  const switchId = useId();
  const labelId = `${switchId}-label`;
  const hintId = `${switchId}-hint`;
  return (
    <label
      className="flex min-h-(--target-size) cursor-pointer items-center justify-between gap-4 py-3"
      htmlFor={switchId}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium" id={labelId}>
          {label}
        </span>
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      </span>
      <Switch.Root
        aria-describedby={hintId}
        aria-labelledby={labelId}
        checked={on}
        className="inline-flex h-7 w-12 shrink-0 items-center rounded-control border border-line bg-field p-0.5 shadow-control data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        disabled={disabled === true}
        id={switchId}
        onCheckedChange={onSwitch}
      >
        <Switch.Thumb className="size-5 rounded-control bg-muted transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-primary motion-reduce:transition-none" />
      </Switch.Root>
    </label>
  );
}
