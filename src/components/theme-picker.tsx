"use client";

import { DropdownMenu } from "radix-ui";
import { type JSX, useId } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { chooseMode, chooseTheme } from "@/themes/theme-choice.ts";
import { THEME_MODES, THEMES } from "@/themes/themes.ts";
import { useThemeChoice } from "@/themes/use-theme-choice.ts";
import { COPY } from "@/ui/copy.ts";

const GROUP_LABEL_CLASSES =
  "px-2 pt-2 pb-1 font-heading text-muted text-xs uppercase tracking-wide";

const ITEM_CLASSES =
  "flex cursor-default select-none items-center gap-2 rounded-control py-1.5 pr-3 pl-2 data-highlighted:bg-accent data-highlighted:text-on-accent";

// The menu stays open after a choice, so the user can pick a theme and a
// mode in one go and see each applied.
function keepMenuOpen(event: Event): void {
  event.preventDefault();
}

function ChoiceMark(): JSX.Element {
  return (
    <span className="flex size-4 items-center justify-center">
      <DropdownMenu.ItemIndicator>
        <svg aria-hidden="true" className="size-2.5" viewBox="0 0 10 10">
          <circle cx="5" cy="5" fill="currentColor" r="5" />
        </svg>
      </DropdownMenu.ItemIndicator>
    </span>
  );
}

function ChoiceItem({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}): JSX.Element {
  return (
    <DropdownMenu.RadioItem
      className={ITEM_CLASSES}
      onSelect={keepMenuOpen}
      value={value}
    >
      <ChoiceMark />
      {label}
    </DropdownMenu.RadioItem>
  );
}

// The site header's menu for the user's theme and mode (Light, Dark or
// System). A choice restyles the page at once and is remembered in this
// browser.
export function ThemePicker(): JSX.Element {
  const choice = useThemeChoice();
  const themeLabelId = useId();
  const modeLabelId = useId();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild={true}>
        <Button variant="secondary">
          <Icon name="appearance" />
          {COPY.theme.picker}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) rounded-box border border-line bg-surface p-1.5 text-foreground shadow-raised data-[state=closed]:motion-safe:animate-pop-out data-[state=open]:motion-safe:animate-pop-in"
          sideOffset={6}
        >
          <DropdownMenu.Label className={GROUP_LABEL_CLASSES} id={themeLabelId}>
            {COPY.theme.themeLabel}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            aria-labelledby={themeLabelId}
            onValueChange={chooseTheme}
            value={choice.theme}
          >
            {THEMES.map(({ id, name }) => (
              <ChoiceItem key={id} label={name} value={id} />
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="mx-1 my-1.5 border-line border-t" />
          <DropdownMenu.Label className={GROUP_LABEL_CLASSES} id={modeLabelId}>
            {COPY.theme.modeLabel}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            aria-labelledby={modeLabelId}
            onValueChange={chooseMode}
            value={choice.mode}
          >
            {THEME_MODES.map((mode) => (
              <ChoiceItem
                key={mode}
                label={COPY.theme.modes[mode]}
                value={mode}
              />
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
