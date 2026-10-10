import { describe, expect, it } from "vitest";
import { readSessionSecret, readSitePassphrase } from "@/auth/auth-env";

describe("readSitePassphrase", () => {
  it("returns SITE_PASSPHRASE from the given environment", () => {
    expect(readSitePassphrase({ SITE_PASSPHRASE: "open sesame" })).toBe(
      "open sesame",
    );
  });

  it("throws when SITE_PASSPHRASE is missing or blank", () => {
    expect(() => readSitePassphrase({})).toThrow(/SITE_PASSPHRASE is not set/);
    expect(() => readSitePassphrase({ SITE_PASSPHRASE: " " })).toThrow(
      /SITE_PASSPHRASE is not set/,
    );
  });
});

describe("readSessionSecret", () => {
  it("returns SESSION_SECRET from the given environment", () => {
    expect(readSessionSecret({ SESSION_SECRET: "s3cret" })).toBe("s3cret");
  });

  it("throws when SESSION_SECRET is missing or blank", () => {
    expect(() => readSessionSecret({})).toThrow(/SESSION_SECRET is not set/);
    expect(() => readSessionSecret({ SESSION_SECRET: "" })).toThrow(
      /SESSION_SECRET is not set/,
    );
  });
});
