import { describe, expect, test } from "vitest";
import { clientKeyFromHeaders } from "@/auth/client-key.ts";

const CLIENT_KEY = "203.0.113.7";

describe("clientKeyFromHeaders", () => {
  test("uses the first address in x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": ` ${CLIENT_KEY} , 10.0.0.1`,
    });

    expect(clientKeyFromHeaders(headers)).toBe(CLIENT_KEY);
  });

  test("falls back to a shared key when no address is known", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });

  test("falls back to the shared key for a blank first address", () => {
    expect(
      clientKeyFromHeaders(new Headers({ "x-forwarded-for": " , 10.0.0.1" })),
    ).toBe("unknown");
  });
});
