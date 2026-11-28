// The HTTP status codes the app sends, checks in tests, or classifies in
// upstream responses, by name. It has no imports, so the proxy, the end-to-end
// specs and the tool configs can all use it.
export const HTTP_STATUS = {
  ok: 200,
  noContent: 204,
  seeOther: 303,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  tooManyRequests: 429,
  internalServerError: 500,
} as const;
