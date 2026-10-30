import { uploadImage } from "@/images/image-http.ts";
export async function POST(request: Request): Promise<Response> {
  return await uploadImage(request);
}
