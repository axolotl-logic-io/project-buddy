"use client";

import { DropdownMenu } from "radix-ui";
import { type JSX, useCallback, useId } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { chooseMode, chooseTheme } from "@/themes/choose-theme.ts";
import { preloadThemeFonts } from "@/themes/preload-theme-fonts.ts";
import { THEME_MODES, THEMES, type ThemeId } from "@/themes/themes.ts";
import { useThemeChoice } from "@/themes/use-theme-choice.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

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

// onPreview runs when the item is pointed at or focused. Radix focuses an
// item on mouse pointermove, so onFocus covers the mouse and the keyboard;
// onPointerEnter also covers pen and touch pointers.
function ChoiceItem({
  value,
  label,
  onPreview,
}: {
  readonly value: string;
  readonly label: string;
  readonly onPreview?: () => void;
}): JSX.Element {
  return (
    <DropdownMenu.RadioItem
      className={ITEM_CLASSES}
      onFocus={onPreview}
      onPointerEnter={onPreview}
      onSelect={keepMenuOpen}
      value={value}
    >
      <ChoiceMark />
      {label}
    </DropdownMenu.RadioItem>
  );
}

// A theme's choice, which starts loading the theme's fonts when it is
// pointed at or focused, so choosing it shows them without a flash of the
// fallback font. The applied theme's fonts came with the page.
function ThemeChoiceItem({
  theme,
  label,
  appliedTheme,
}: {
  readonly theme: ThemeId;
  readonly label: string;
  readonly appliedTheme: ThemeId;
}): JSX.Element {
  const preview = useCallback((): void => {
    preloadThemeFonts(theme, appliedTheme);
  }, [theme, appliedTheme]);
  return <ChoiceItem label={label} onPreview={preview} value={theme} />;
}

// The site header's menu for the user's theme and mode (Light, Dark or
// System). A choice restyles the page at once and is remembered in this
// browser. Below sm its trigger shows only the icon, keeping its name for
// screen readers, so the signed-in header fits a phone in two rows.
export function ThemePicker(): JSX.Element {
  const choice = useThemeChoice();
  const themeLabelId = useId();
  const modeLabelId = useId();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild={true}>
        <Button className="min-w-(--target-size)" variant="secondary">
          <Icon name="appearance" />
          <span className="sr-only sm:not-sr-only">{THEME_COPY.picker}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) rounded-box border border-line bg-surface p-1.5 text-foreground shadow-raised data-[state=closed]:motion-safe:animate-pop-out data-[state=open]:motion-safe:animate-pop-in"
          sideOffset={6}
        >
          <DropdownMenu.Label className={GROUP_LABEL_CLASSES} id={themeLabelId}>
            {THEME_COPY.themeLabel}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            aria-labelledby={themeLabelId}
            onValueChange={chooseTheme}
            value={choice.theme}
          >
            {THEMES.map(({ id, name }) => (
              <ThemeChoiceItem
                appliedTheme={choice.theme}
                key={id}
                label={name}
                theme={id}
              />
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="mx-1 my-1.5 border-line border-t" />
          <DropdownMenu.Label className={GROUP_LABEL_CLASSES} id={modeLabelId}>
            {THEME_COPY.modeLabel}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            aria-labelledby={modeLabelId}
            onValueChange={chooseMode}
            value={choice.mode}
          >
            {THEME_MODES.map((mode) => (
              <ChoiceItem
                key={mode}
                label={THEME_COPY.modes[mode]}
                value={mode}
              />
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
