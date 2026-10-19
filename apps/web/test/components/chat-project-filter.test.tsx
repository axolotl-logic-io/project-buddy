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
const LONG_NAME_REPEATS = 12;
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
    expect(select.querySelectorAll("option[selected]")).toHaveLength(1);
    expect(filter.getByRole("option", { name: "All" })).toHaveAttribute(
      "selected",
    );
    expect(filter.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(filter.queryByRole("textbox")).not.toBeInTheDocument();
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
});

test("selects by id when two projects have the same name", () => {
  const filter = serverFilter({
    projects: PROJECTS.map(({ id }) => ({ id, name: "Shared name" })),
    selectedProjectId: APPLE_ID,
  });

  expect(filter.getAllByRole("option", { name: "Shared name" })).toHaveLength(
    2,
  );
  expect(filter.getByRole("option", { selected: true })).toHaveValue(APPLE_ID);
  expect(filter.getByRole("combobox")).toHaveValue(APPLE_ID);
});

describe("chat project filter selection", () => {
  test.each(PROJECTS)(
    "keeps $name selected on a fresh server render and reload",
    ({ id, name }) => {
      // A reload renders new HTML from the same props, not client selection state.
      for (const filter of [
        serverFilter({ projects: PROJECTS, selectedProjectId: id }),
        serverFilter({ projects: PROJECTS, selectedProjectId: id }),
      ]) {
        const select = filter.getByRole("combobox");
        expect(select).toHaveValue(id);
        expect(filter.getAllByRole("option", { selected: true })).toHaveLength(
          1,
        );
        expect(select.querySelectorAll("option[selected]")).toHaveLength(1);
        expect(filter.getByRole("option", { name })).toHaveAttribute(
          "selected",
        );
      }
    },
  );

  test("falls back to All for an unrecognized project id", () => {
    const filter = serverFilter({
      projects: PROJECTS,
      selectedProjectId: UNKNOWN_ID,
    });

    const select = filter.getByRole("combobox");
    expect(select).toHaveValue("");
    expect(select.querySelectorAll("option[selected]")).toHaveLength(1);
    expect(filter.getByRole("option", { name: "All" })).toHaveAttribute(
      "selected",
    );
    expect(filter.getByRole("option", { selected: true })).toHaveTextContent(
      "All",
    );
    expect(
      filter
        .getAllByRole("option")
        .map((option) => option.getAttribute("value")),
    ).toEqual(["", ZEBRA_ID, APPLE_ID]);
  });
});

describe("chat project filter server markup", () => {
  test("preserves full project names as text, including markup characters", () => {
    const name = '<img src=x onerror="alert(1)"> & "Orchard" '.repeat(
      LONG_NAME_REPEATS,
    );
    const filter = serverFilter({
      projects: [{ id: APPLE_ID, name }],
      selectedProjectId: APPLE_ID,
    });
    const option = filter.getByRole("option", { selected: true });

    expect(option.textContent).toBe(name);
    expect(option.children).toHaveLength(0);
    expect(option).toHaveValue(APPLE_ID);
  });

  test("keeps each label associated with its own field when reused", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <>
        <ChatProjectFilter projects={PROJECTS} selectedProjectId={APPLE_ID} />
        <ChatProjectFilter projects={[]} />
      </>,
    );
    const filters = within(container);
    const selects = filters.getAllByRole("combobox", { name: "Project" });
    const [selected, all] = selects;
    if (selected === undefined || all === undefined) {
      throw new Error("Both filter fields must be present");
    }

    expect(filters.getAllByLabelText("Project")).toEqual(selects);
    expect(selected.id).not.toBe(all.id);
    expect(selected).toHaveValue(APPLE_ID);
    expect(all).toHaveValue("");
    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(2);
    expect([...forms].map((form) => [...new FormData(form)])).toEqual([
      [["project", APPLE_ID]],
      [["project", ""]],
    ]);
  });
});

describe("chat project filter without projects", () => {
  test.each([undefined, UNKNOWN_ID])(
    "offers All alone when there are no projects (selection %s)",
    (selectedProjectId) => {
      const filter = serverFilter({ projects: [], selectedProjectId });

      expect(filter.getAllByRole("option")).toHaveLength(1);
      expect(filter.getByRole("combobox")).toHaveValue("");
      expect(filter.getByRole("option")).toHaveTextContent("All");
      expect(filter.getByRole("option")).toHaveAttribute("value", "");
      expect(filter.getByRole("option")).toHaveAttribute("selected");
      expect(filter.getByRole("button", { name: "Show chats" })).toBeEnabled();
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
