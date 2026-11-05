import { deliverVisualAsset } from "@/constructs/visual-http.ts";

async function GET(
  _request: Request,
  context: RouteContext<"/api/constructs/visuals/[kind]/[id]/[assetId]">,
): Promise<Response> {
  const { kind, id, assetId } = await context.params;
  return await deliverVisualAsset(kind, id, assetId);
}

export { GET };
