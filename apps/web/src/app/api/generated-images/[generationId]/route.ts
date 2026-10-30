import { deliverGeneratedImage } from "@/images/generation-http.ts";

async function GET(
  request: Request,
  context: { readonly params: Promise<{ generationId: string }> },
): Promise<Response> {
  const { generationId } = await context.params;
  return await deliverGeneratedImage(
    generationId,
    new URL(request.url).searchParams.get("download") === "1",
  );
}

export { GET };
