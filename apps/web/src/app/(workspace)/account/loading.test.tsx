import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import AccountLoading from "./loading.tsx";

describe("Account loading", () => {
  test("says it is loading this month's usage while the page streams in", () => {
    render(<AccountLoading />);

    expect(screen.getByText(ACCOUNT_COPY.loading)).toBeInTheDocument();
  });
});
