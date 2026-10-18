import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { RadioCardGroup } from "@/components/ui/radio-card-group.tsx";

const OPTIONS = [
  { value: "flat", label: "Flat" },
  { value: "smooth", label: "Smooth" },
];

// The group inside a form, as the forms use it.
function renderInForm(): HTMLFormElement {
  render(
    <form aria-label="Chat">
      <RadioCardGroup
        defaultValue="flat"
        label="Shading"
        name="shading"
        options={OPTIONS}
      />
    </form>,
  );
  return screen.getByRole<HTMLFormElement>("form", { name: "Chat" });
}

function sent(form: HTMLFormElement): Record<string, FormDataEntryValue> {
  return Object.fromEntries(new FormData(form));
}

describe("RadioCardGroup", () => {
  test("is a group named by its label, with one radio per option", () => {
    renderInForm();

    const group = screen.getByRole("radiogroup", { name: "Shading" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(OPTIONS.length);
  });

  test("starts with the default chosen, and sends it under its name", () => {
    const form = renderInForm();

    expect(screen.getByRole("radio", { name: "Flat" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Smooth" })).not.toBeChecked();
    expect(sent(form)).toEqual({ shading: "flat" });
  });

  test("chooses the card she picks, and sends its value instead", () => {
    const form = renderInForm();

    fireEvent.click(screen.getByRole("radio", { name: "Smooth" }));

    expect(screen.getByRole("radio", { name: "Smooth" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Flat" })).not.toBeChecked();
    expect(sent(form)).toEqual({ shading: "smooth" });
  });
});
