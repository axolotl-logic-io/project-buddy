import {
  type BoundFunctions,
  fireEvent,
  type queries,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../id-fixtures.ts";

type FilterProps = ComponentProps<typeof ChatProjectFilter>;

const ZEBRA_ID = projectIdFixture();
const APPLE_ID = projectIdFixture();
const UNKNOWN_ID = projectIdFixture();
const PROJECTS: FilterProps["projects"] = [
  { id: ZEBRA_ID, name: "Zebra sculpture" },
  { id: APPLE_ID, name: "Apple orchard" },
];

// Parse only the server's HTML: the contract must work before hydration.
function serverFilter(props: FilterProps): BoundFunctions<typeof queries> {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ChatProjectFilter {...props} />);
  return within(container);
}

describe("chat project filter", () => {
  test("labels the project field and defaults to All", () => {
    const filter = serverFilter({ projects: PROJECTS });
    const select = filter.getByRole("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    });

    expect(select).toBe(filter.getByLabelText("Project"));
    expect(select).toHaveAttribute("name", "project");
    expect(select).toHaveValue("");
    expect(filter.getByRole("option", { name: "All" })).toHaveValue("");
  });

  test("offers only All followed by the supplied projects in supplied order", () => {
    const filter = serverFilter({ projects: PROJECTS });

    expect(
      filter.getAllByRole("option").map((option) => ({
        label: option.textContent,
        value: option.getAttribute("value"),
      })),
    ).toEqual([
      { label: "All", value: "" },
      { label: "Zebra sculpture", value: ZEBRA_ID },
      { label: "Apple orchard", value: APPLE_ID },
    ]);
  });

  test.each(PROJECTS)("keeps $name selected in the server HTML", ({ id }) => {
    const filter = serverFilter({
      projects: PROJECTS,
      selectedProjectId: id,
    });

    expect(filter.getByRole("combobox")).toHaveValue(id);
    expect(filter.getAllByRole("option", { selected: true })).toHaveLength(1);
  });

  test("falls back to All for an unrecognized project id", () => {
    const filter = serverFilter({
      projects: PROJECTS,
      selectedProjectId: UNKNOWN_ID,
    });

    expect(filter.getByRole("combobox")).toHaveValue("");
    expect(filter.getByRole("option", { selected: true })).toHaveTextContent(
      "All",
    );
  });

  test.each([undefined, UNKNOWN_ID])(
    "offers All alone when there are no projects (selection %s)",
    (selectedProjectId) => {
      const filter = serverFilter({ projects: [], selectedProjectId });

      expect(filter.getAllByRole("option")).toHaveLength(1);
      expect(filter.getByRole("combobox")).toHaveValue("");
      expect(filter.getByRole("option")).toHaveTextContent("All");
    },
  );
});

describe("chat project filter submission", () => {
  test("submits to /chat by GET with an enabled Show chats button", () => {
    const filter = serverFilter({ projects: PROJECTS });
    const button = filter.getByRole("button", { name: "Show chats" });
    const form = button.closest("form");

    expect(form).toHaveAttribute("action", "/chat");
    expect(form).toHaveAttribute("method", "get");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
    expect(filter.getByRole("combobox").closest("form")).toBe(form);
  });

  test("the native field serializes a project choice and All without client state", () => {
    const filter = serverFilter({ projects: PROJECTS });
    const select = filter.getByRole("combobox");
    const form = select.closest("form");
    if (form === null) {
      throw new Error("The project field has no form");
    }

    fireEvent.change(select, { target: { value: APPLE_ID } });
    expect([...new FormData(form)]).toEqual([["project", APPLE_ID]]);
    fireEvent.change(select, { target: { value: "" } });
    expect([...new FormData(form)]).toEqual([["project", ""]]);
  });
});
