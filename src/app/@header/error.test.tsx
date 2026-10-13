import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import HeaderLinksError from "./error.tsx";

describe("Header links error", () => {
  test("shows nothing, leaving the problem to the page", () => {
    const { container } = render(<HeaderLinksError />);

    expect(container).toBeEmptyDOMElement();
  });
});
