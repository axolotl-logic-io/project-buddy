import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SearchManualPart } from "@/components/chat/search-manual-part.tsx";
import { COPY } from "@/ui/copy.ts";

const ARGS = { query: "bevel edge" };

describe("SearchManualPart", () => {
  test("says what the tutor is searching for while it searches", () => {
    render(<SearchManualPart part={{ args: ARGS, result: undefined }} />);

    expect(
      screen.getByText(COPY.citations.searching("bevel edge")),
    ).toBeInTheDocument();
  });

  test("says what the tutor searched for once the search is done", () => {
    render(
      <SearchManualPart part={{ args: ARGS, result: { sections: [] } }} />,
    );

    expect(
      screen.getByText(COPY.citations.searched("bevel edge")),
    ).toBeInTheDocument();
  });

  test("says the search failed", () => {
    render(
      <SearchManualPart
        part={{ args: ARGS, result: { error: "boom" }, isError: true }}
      />,
    );

    expect(
      screen.getByText(COPY.citations.searchFailed("bevel edge")),
    ).toBeInTheDocument();
  });

  test("shows nothing while the query is still arriving", () => {
    const { container } = render(
      <SearchManualPart part={{ args: {}, result: undefined }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
