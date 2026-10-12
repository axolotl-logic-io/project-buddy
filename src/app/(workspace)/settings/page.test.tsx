import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { FLAGS } from "@/flags/flags.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import SettingsPage, { metadata } from "./page.tsx";

describe("Settings page", () => {
  test("is titled Settings and links home", () => {
    render(<SettingsPage />);

    expect(metadata.title).toBe(SETTINGS_COPY.title);
    expect(
      screen.getByRole("heading", { level: 1, name: SETTINGS_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: SETTINGS_COPY.homeLink }),
    ).toHaveAttribute("href", "/");
  });

  test("offers a switch for each extra under the Extras heading", () => {
    render(<SettingsPage />);

    const extras = screen.getByRole("region", {
      name: SETTINGS_COPY.extrasHeading,
    });
    expect(within(extras).getAllByRole("switch")).toHaveLength(FLAGS.length);
  });

  test("leaves the main landmark to the root layout", () => {
    render(<SettingsPage />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
