import { expect, test } from "vitest";
import { GET } from "@/app/(workspace)/account/route.ts";

const TEMPORARY_REDIRECT = 307;

test.each([
  ["", ""],
  ["?section=batteries", "?section=batteries#batteries"],
  ["?section=security", "?section=security#security"],
  ["?battery=returned", "?battery=returned#buy-batteries"],
  ["?battery=canceled", "?battery=canceled#buy-batteries"],
  ["?section=unknown", "?section=unknown"],
])(
  "old Account links retain their query and reach the correct Settings section (%s)",
  (query, target) => {
    const response = GET(new Request(`http://localhost/account${query}`));
    expect(response.status).toBe(TEMPORARY_REDIRECT);
    expect(response.headers.get("location")).toBe(
      `http://localhost/settings${target}`,
    );
  },
);

test("a bare Account redirect lets the browser inherit its existing anchor", () => {
  const response = GET(new Request("http://localhost/account"));
  expect(new URL(response.headers.get("location") ?? "").hash).toBe("");
});
