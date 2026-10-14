import { RadioGroup } from "radix-ui";
import { type JSX, useId } from "react";

// One choice of a radio card group: the value the form sends, and its name.
interface RadioCardOption {
  readonly value: string;
  readonly label: string;
}

// A named group of choices, shown as cards, of which the user picks one.
// Inside a form it sends the chosen value under name, like a native radio
// group; arrow keys move between the cards.
export function RadioCardGroup({
  name,
  label,
  options,
  defaultValue,
}: {
  readonly name: string;
  readonly label: string;
  readonly options: readonly RadioCardOption[];
  readonly defaultValue: string;
}): JSX.Element {
  const labelId = useId();
  return (
    <div className="field">
      <p className="field-label" id={labelId}>
        {label}
      </p>
      <RadioGroup.Root
        aria-labelledby={labelId}
        className="grid gap-2 sm:grid-cols-2"
        defaultValue={defaultValue}
        name={name}
        required={true}
      >
        {options.map((option) => (
          <RadioGroup.Item
            className="radio-card"
            key={option.value}
            value={option.value}
          >
            <span className="radio-card-mark">
              <RadioGroup.Indicator className="size-2 rounded-full bg-primary" />
            </span>
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
