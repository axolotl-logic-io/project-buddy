import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SearchManualPart } from "@/components/chat/search-manual-part.tsx";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";

const ARGS = { query: "bevel edge" };

describe("SearchManualPart", () => {
  test("says what the tutor is searching for while it searches", () => {
    render(<SearchManualPart part={{ args: ARGS, result: undefined }} />);

    expect(
      screen.getByText(CITATIONS_COPY.searching("bevel edge")),
    ).toBeInTheDocument();
  });

  test("says what the tutor searched for once the search is done", () => {
    render(
      <SearchManualPart part={{ args: ARGS, result: { sections: [] } }} />,
    );

    expect(
      screen.getByText(CITATIONS_COPY.searched("bevel edge")),
    ).toBeInTheDocument();
  });

  test("shows nothing while the query is still arriving", () => {
    const { container } = render(
      <SearchManualPart part={{ args: {}, result: undefined }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
