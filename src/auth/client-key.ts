// Names the client a request comes from, for the limits that count per
// client: its address, as Vercel sets x-forwarded-for to it. Requests that
// name no address share the key "unknown".
function clientKeyFromHeaders(headers: Headers): string {
  const [firstAddress = ""] = headers.get("x-forwarded-for")?.split(",") ?? [];
  const address = firstAddress.trim();
  if (address === "") {
    return "unknown";
  }
  return address;
}

export { clientKeyFromHeaders };
