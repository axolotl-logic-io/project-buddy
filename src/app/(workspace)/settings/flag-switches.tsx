"use client";

import { Switch } from "radix-ui";
import { type JSX, useCallback, useId } from "react";
import { FLAGS, type FlagId } from "@/flags/flags.ts";
import { switchFlag } from "@/flags/switch-flag.ts";
import { useHiddenFlags } from "@/flags/use-hidden-flags.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";

// One extra's switch: its label and hint, which are one target with the
// switch, at least 44px tall.
function FlagSwitch({
  id,
  copy,
  on,
}: {
  readonly id: FlagId;
  readonly copy: { readonly label: string; readonly hint: string };
  readonly on: boolean;
}): JSX.Element {
  const switchId = useId();
  const labelId = `${switchId}-label`;
  const hintId = `${switchId}-hint`;
  const switchThisFlag = useCallback(
    (checked: boolean): void => {
      switchFlag(id, checked);
    },
    [id],
  );
  return (
    <label
      className="flex min-h-(--target-size) cursor-pointer items-center justify-between gap-4 py-3"
      htmlFor={switchId}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium" id={labelId}>
          {copy.label}
        </span>
        <span className="field-hint" id={hintId}>
          {copy.hint}
        </span>
      </span>
      <Switch.Root
        aria-describedby={hintId}
        aria-labelledby={labelId}
        checked={on}
        className="inline-flex h-7 w-12 shrink-0 items-center rounded-control border border-line bg-field p-0.5 shadow-control data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        id={switchId}
        onCheckedChange={switchThisFlag}
      >
        <Switch.Thumb className="size-5 rounded-control bg-muted transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-primary motion-reduce:transition-none" />
      </Switch.Root>
    </label>
  );
}

// The Settings page's switches, one per extra, each on unless the user has
// hidden the extra. A switch applies at once and is saved to her account,
// so her other browsers show it once she signs in there.
export function FlagSwitches(): JSX.Element {
  const hidden = useHiddenFlags();
  return (
    <ul className="flex flex-col divide-y divide-line">
      {FLAGS.map(({ id, copyKey }) => (
        <li key={id}>
          <FlagSwitch
            copy={FLAG_COPY[copyKey]}
            id={id}
            on={!hidden.includes(id)}
          />
        </li>
      ))}
    </ul>
  );
}
