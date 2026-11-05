import {
  getVisualGeneration,
  postVisualGeneration,
} from "@/constructs/visual-http.ts";

async function GET(request: Request): Promise<Response> {
  return await getVisualGeneration(request);
}
async function POST(request: Request): Promise<Response> {
  return await postVisualGeneration(request);
}

export { GET, POST };
