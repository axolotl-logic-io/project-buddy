// The HTTP status codes the app sends, checks in tests, or classifies in
// upstream responses, by name. It has no imports, so the proxy, the end-to-end
// specs and the tool configs can all use it.
export const HTTP_STATUS = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  tooManyRequests: 429,
  internalServerError: 500,
  badGateway: 502,
  // Not a standard status: Anthropic answers 529 when its API is overloaded.
  overloaded: 529,
} as const;
