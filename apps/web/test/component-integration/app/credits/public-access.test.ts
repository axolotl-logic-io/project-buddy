import { NextRequest } from "next/server";
import { expect, test } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";
import { proxy } from "@/proxy.ts";

test("Credits is accessible without a session", async () => {
  const response = await proxy(new NextRequest("http://localhost/credits"));
  expect(response.status).toBe(HTTP_STATUS.ok);
  expect(response.headers.get("location")).toBeNull();
});
