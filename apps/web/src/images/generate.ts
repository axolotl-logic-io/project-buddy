import type { ChatId, UserId } from "@/ids.ts";
import type {
  GenerateImageOutput,
  GenerationId,
} from "@/images/generation-contract.ts";
import type { GeneratedImage, ImageProvider } from "@/images/image-provider.ts";

interface GenerationRequest {
  readonly owner: UserId;
  readonly chatId: ChatId;
  readonly requestId: string;
  readonly prompt: string;
}
type GenerationClaim =
  | { readonly status: "claimed"; readonly id: GenerationId }
  | GenerateImageOutput;

// Storage owns atomic quota reservation and replay protection. Completion
// persists bytes through the same image store as uploads, then settles cost.
interface GenerationServices {
  readonly provider: ImageProvider | undefined;
  readonly claim: (request: GenerationRequest) => Promise<GenerationClaim>;
  readonly complete: (
    owner: UserId,
    id: GenerationId,
    image: GeneratedImage,
  ) => Promise<boolean>;
  readonly fail: (owner: UserId, id: GenerationId) => Promise<void>;
}

async function generateForChat(
  request: GenerationRequest,
  services: GenerationServices,
): Promise<GenerateImageOutput> {
  if (services.provider === undefined) {
    return { status: "unavailable" };
  }
  const claim = await services.claim(request);
  if (claim.status !== "claimed") {
    return claim;
  }
  try {
    const image = await services.provider.generate(request.prompt);
    if (await services.complete(request.owner, claim.id, image)) {
      return { status: "generated", id: claim.id, prompt: request.prompt };
    }
    return { status: "failed" };
  } catch {
    // Never retry a potentially billed request automatically. Keep the
    // reservation on ambiguous provider or persistence failure.
    await services.fail(request.owner, claim.id);
    return { status: "failed" };
  }
}

export type { GenerationClaim, GenerationRequest, GenerationServices };
export { generateForChat };
