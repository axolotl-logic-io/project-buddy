import { describe, expect, test } from "vitest";
import {
  isManualPage,
  isManualUrl,
  manualUrl,
} from "@/manual/manual-source.ts";

describe("isManualPage", () => {
  test("accepts the RST files under manual/, at any depth", () => {
    expect(isManualPage("manual/index.rst")).toBe(true);
    expect(isManualPage("manual/modeling/meshes/editing/edge/bevel.rst")).toBe(
      true,
    );
  });

  test("rejects other files under manual/ and RST files outside it", () => {
    expect(isManualPage("manual/conf.py")).toBe(false);
    expect(isManualPage("manual/index.rst.orig")).toBe(false);
    expect(isManualPage("README.rst")).toBe(false);
    expect(isManualPage("tools/manual/index.rst")).toBe(false);
  });
});

describe("manualUrl", () => {
  test("builds the latest manual URL for a page", () => {
    expect(
      manualUrl("manual/modeling/meshes/editing/edge/bevel.rst", "usage"),
    ).toBe(
      "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage",
    );
  });
});

describe("isManualUrl", () => {
  test("accepts the URLs manualUrl builds", () => {
    expect(
      isManualUrl(
        manualUrl("manual/modeling/meshes/editing/edge/bevel.rst", "usage"),
      ),
    ).toBe(true);
  });

  test("rejects lookalike hosts, plain http and other paths on the host", () => {
    expect(
      isManualUrl(
        "https://docs.blender.org.evil.example/manual/en/latest/index.html",
      ),
    ).toBe(false);
    expect(
      isManualUrl("http://docs.blender.org/manual/en/latest/index.html"),
    ).toBe(false);
    expect(isManualUrl("https://docs.blender.org/api/current/")).toBe(false);
    expect(
      isManualUrl("https://docs.blender.org/manual/en/latest/../../api/"),
    ).toBe(false);
    expect(
      isManualUrl("https://me@docs.blender.org/manual/en/latest/index.html"),
    ).toBe(false);
  });

  test("rejects malformed links", () => {
    expect(isManualUrl("docs.blender.org/manual/en/latest/")).toBe(false);
    expect(isManualUrl("not a link")).toBe(false);
    expect(isManualUrl("")).toBe(false);
  });

  test("works in browsers without URL.parse", () => {
    // Safari before 18 and Firefox before 126 lack URL.parse.
    // Under jsdom, URL inherits parse from Node's URL, so shadow it rather
    // than delete it.
    const parse = Object.getOwnPropertyDescriptor(URL, "parse");
    Object.defineProperty(URL, "parse", {
      value: undefined,
      configurable: true,
    });
    try {
      expect(
        isManualUrl(
          manualUrl("manual/modeling/meshes/editing/edge/bevel.rst", "usage"),
        ),
      ).toBe(true);
      expect(isManualUrl("not a link")).toBe(false);
      expect(isManualUrl("")).toBe(false);
    } finally {
      if (parse === undefined) {
        Reflect.deleteProperty(URL, "parse");
      } else {
        Object.defineProperty(URL, "parse", parse);
      }
    }
  });
});
