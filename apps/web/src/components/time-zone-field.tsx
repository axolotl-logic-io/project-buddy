"use client";

import { type ChangeEvent, type JSX, useCallback, useState } from "react";
import { DEFAULT_TIME_ZONE, localTimeZone } from "@/accounts/time-zone.ts";
import { SelectField } from "@/components/ui/field.tsx";
import { useHydrated } from "@/components/use-hydrated.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

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
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const isHydrated = useHydrated();
  const choose = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setChosen(event.currentTarget.value);
  }, []);
  let value = chosen ?? saved;
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
