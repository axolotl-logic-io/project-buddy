import { deliverImage } from "@/images/image-http.ts";
export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> },
): Promise<Response> {
  const { imageId } = await context.params;
  return await deliverImage(imageId);
}
