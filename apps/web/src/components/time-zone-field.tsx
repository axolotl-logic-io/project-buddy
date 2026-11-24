"use client";

import {
  type ChangeEvent,
  type JSX,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import { DEFAULT_TIME_ZONE, localTimeZone } from "@/accounts/time-zone.ts";
import { SelectField } from "@/components/ui/field.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

function subscribeToNothing(): () => void {
  return (): void => {
    // Whether the page is hydrated never changes once it is.
  };
}

function hydrated(): boolean {
  return true;
}

function notHydrated(): boolean {
  return false;
}

// The time zone field, named timeZone in its form. With no saved time zone,
// it starts at the browser's own once hydrated, and at UTC before then or
// when the browser's isn't a choice.
function TimeZoneField({
  choices,
  saved,
  error,
}: {
  readonly choices: readonly string[];
  readonly saved?: string | undefined;
  readonly error?: string | undefined;
}): JSX.Element {
  const [chosen, setChosen] = useState(saved);
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    hydrated,
    notHydrated,
  );
  const choose = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setChosen(event.currentTarget.value);
  }, []);
  let value = chosen;
  if (value === undefined && isHydrated) {
    value = localTimeZone(choices);
  }
  return (
    <SelectField
      label={ACCOUNT_COPY.timeZoneLabel}
      hint={ACCOUNT_COPY.timeZoneHint}
      error={error}
      name="timeZone"
      value={value ?? DEFAULT_TIME_ZONE}
      onChange={choose}
    >
      {choices.map((name) => (
        <option key={name} value={name}>
          {name.replaceAll("_", " ")}
        </option>
      ))}
    </SelectField>
  );
}

export { TimeZoneField };
