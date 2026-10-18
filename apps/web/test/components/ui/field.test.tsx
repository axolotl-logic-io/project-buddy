import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field.tsx";

const NAME = "Project name";
const HINT = "A short name you'll recognise.";
const NEEDS_NAME = "A project needs a name.";
const FOX = "Low-poly fox";
const DONUT = "Donut";

describe("TextField", () => {
  test("is named by its label and sends its value under its name", () => {
    render(<TextField label={NAME} name="name" required={true} />);

    const field = screen.getByRole("textbox", { name: NAME });
    expect(field).toHaveAttribute("name", "name");
    expect(field).toBeRequired();
    expect(field).not.toHaveAttribute("aria-describedby");
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  test("is described by its hint", () => {
    render(<TextField hint={HINT} label={NAME} name="name" />);

    expect(
      screen.getByRole("textbox", { name: NAME }),
    ).toHaveAccessibleDescription(HINT);
  });

  test("shows its error as an alert, described by it and marked invalid", () => {
    render(
      <TextField error={NEEDS_NAME} hint={HINT} label={NAME} name="name" />,
    );

    const field = screen.getByRole("textbox", { name: NAME });
    expect(screen.getByRole("alert")).toHaveTextContent(NEEDS_NAME);
    expect(field).toHaveAccessibleDescription(`${HINT} ${NEEDS_NAME}`);
    expect(field).toBeInvalid();
  });

  test("gives each field its own ids", () => {
    render(
      <>
        <TextField error={NEEDS_NAME} label={NAME} name="name" />
        <TextField label="Invite code" name="inviteCode" type="password" />
      </>,
    );

    expect(screen.getByLabelText(NAME)).toHaveAccessibleDescription(NEEDS_NAME);
    expect(screen.getByLabelText("Invite code")).not.toHaveAttribute(
      "aria-describedby",
    );
    expect(screen.getByLabelText("Invite code")).toHaveAttribute(
      "type",
      "password",
    );
  });
});

describe("TextAreaField", () => {
  test("is a labelled multi-line field with its hint and error wired", () => {
    render(
      <TextAreaField
        error={NEEDS_NAME}
        hint={HINT}
        label="Memory"
        name="text"
      />,
    );

    const field = screen.getByRole("textbox", { name: "Memory" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAccessibleDescription(`${HINT} ${NEEDS_NAME}`);
    expect(field).toBeInvalid();
  });
});

describe("SelectField", () => {
  test("is a labelled choice of its options", () => {
    render(
      <SelectField defaultValue="donut" label="Project" name="projectId">
        <option value="fox">{FOX}</option>
        <option value="donut">{DONUT}</option>
      </SelectField>,
    );

    const select = screen.getByRole("combobox", { name: "Project" });
    expect(select).toHaveValue("donut");
    expect(select).toHaveAttribute("name", "projectId");
  });
});
