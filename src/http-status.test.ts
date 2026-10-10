import { expect, test } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";

test("names each status the app sends, checks or classifies", () => {
  expect(HTTP_STATUS).toStrictEqual({
    ok: 200,
    badRequest: 400,
    unauthorized: 401,
    paymentRequired: 402,
    forbidden: 403,
    notFound: 404,
    payloadTooLarge: 413,
    tooManyRequests: 429,
    internalServerError: 500,
    badGateway: 502,
    overloaded: 529,
  });
});
