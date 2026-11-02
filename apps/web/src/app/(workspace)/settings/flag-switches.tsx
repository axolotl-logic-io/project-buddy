"use client";

import { type JSX, useCallback } from "react";
import { SettingSwitch } from "@/components/ui/setting-switch.tsx";
import { FLAGS, type FlagId } from "@/flags/flags.ts";
import { switchFlag } from "@/flags/switch-flag.ts";
import { useHiddenFlags } from "@/flags/use-hidden-flags.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";

// One extra's switch.
function FlagSwitch({
  id,
  copy,
  on,
}: {
  readonly id: FlagId;
  readonly copy: { readonly label: string; readonly hint: string };
  readonly on: boolean;
}): JSX.Element {
  const switchThisFlag = useCallback(
    (checked: boolean): void => {
      switchFlag(id, checked);
    },
    [id],
  );
  return (
    <SettingSwitch
      hint={copy.hint}
      label={copy.label}
      on={on}
      onSwitch={switchThisFlag}
    />
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
