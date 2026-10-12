import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { RadioCardGroup } from "@/components/ui/radio-card-group.tsx";

const OPTIONS = [
  { value: "hippy", label: "Hippy" },
  { value: "mr-t", label: "Mr. T" },
];

// The group inside a form, as the forms use it.
function renderInForm(): HTMLFormElement {
  render(
    <form aria-label="Chat">
      <RadioCardGroup
        defaultValue="hippy"
        label="Persona"
        name="personaId"
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

    const group = screen.getByRole("radiogroup", { name: "Persona" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(OPTIONS.length);
  });

  test("starts with the default chosen, and sends it under its name", () => {
    const form = renderInForm();

    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mr. T" })).not.toBeChecked();
    expect(sent(form)).toEqual({ personaId: "hippy" });
  });

  test("chooses the card she picks, and sends its value instead", () => {
    const form = renderInForm();

    fireEvent.click(screen.getByRole("radio", { name: "Mr. T" }));

    expect(screen.getByRole("radio", { name: "Mr. T" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Hippy" })).not.toBeChecked();
    expect(sent(form)).toEqual({ personaId: "mr-t" });
  });
});
