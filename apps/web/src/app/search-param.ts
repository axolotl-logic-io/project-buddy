// A page's search parameters, as Next.js gives them.

// A search parameter given once; a repeated or missing one reads as absent.
function singleValue(
  parameter: string | string[] | undefined,
): string | undefined {
  if (typeof parameter === "string") {
    return parameter;
  }
  return undefined;
}

export { singleValue };
