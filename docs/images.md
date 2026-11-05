# Images

## Image generation

A construct can call `generate_image` when the user asks for an image. The tool creates at most one 1024×1024 image per user message at low quality, using a prompt of at most 1000 characters. It requests WebP output at compression 80 to fit the shared image store's size limit. The result appears in the adventure and in the owner's Image gallery, with the prompt, download link and source adventure.

The provider is OpenAI's `gpt-image-2`, through the Vercel AI SDK's image-model interface. The image provider lives in `apps/web/src/images/image-provider.ts`; it is independent of the adventure provider. A replacement provider implements `ImageProvider` and must update the reservation and pricing together. The adventure model remains swappable through the AI SDK.

## Configure the provider

Set `OPENAI_API_KEY` in the site's environment using the platform's secret controls. For local development, use the ignored `apps/web/.env.local`. Do not put credentials in commits, logs or issue comments. The OpenAI account needs image-model access and sufficient billing credit; account verification may be required. The real image provider is also disabled when `CONSTRUCT_MODEL=mock`; tests inject a fake provider. Missing credentials leave text adventure available and make generation return an unavailable result.

No storage credential is needed. Generation reuses the upload feature's `images/store.ts`, private Postgres image rows and authenticated delivery boundary. Both features validate supported image bytes and share the adventure access boundary. Provider URLs are never used as persistent image storage or fetched from user input.

## Gold and billing

Images and adventures spend the same [gold](../GLOSSARY.md#gold) balance, which never resets. Generation charges the acting user, including a member replying in a team quest. Generation atomically reserves 25 gold ($0.25) before a provider call, while locking the user's balance row, and refuses the request when the balance doesn't cover the reservation. Concurrent image requests cannot each spend the same remaining gold. A durable claim for the answered user message prevents repeated tool calls or reply retries from generating or charging twice, even if the model assigns a new tool-call identifier.

Successful calls replace the reservation with reported spending, rounded up to micro-USD: text input tokens × 2.5 plus image output tokens × 15. These rates are $2.50 and $15 per million tokens. Text-only prompts, one low-quality square output and no automatic retries bound each request. Review rates and the reservation before changing the model, dimensions, quality or prompt limit.

A timeout, missing usage, provider failure or persistence failure retains the reservation because the provider might have billed the request. The provider timeout is two minutes. A process interrupted before completion leaves a pending entry in the gallery and never restarts automatically. Check provider billing before making a manual accounting correction. A known image saved successfully uses its actual charge, even if the adventure reply subsequently fails. An adventure call already under way may finish and take the balance below 0; image generation keeps to its reservation instead.

## Ownership and deletion

Gallery queries and image delivery use the acting user from the session and enforce adventure access. The quest owner and current team members can read images in their quest adventures; other users cannot. Image responses are private and non-cacheable; knowing another user's identifier grants no access. Generation metadata records the source adventure and prompt. The gallery shows up to 40 entries per page, newest first.

Images belong to their source adventure. Database cascades delete image bytes and generation metadata with the adventure, its quest or the account. There is no independent image-delete control. Deleting an image's source never refunds spending. Copies already downloaded remain with the user.

## Validation

Tests use fake generation providers and the guarded local test database. Never use the shared database or a real paid model to test generation. The server suite covers tool calls, persistence, delivery, gold reservation under concurrency, replay and owner isolation. Browser tests cover progress, errors, gallery links and phone layout.

## Provider references

Configuration and rates were checked on 2026-10-30 against the [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), and [AI SDK OpenAI image models](https://ai-sdk.dev/providers/ai-sdk-providers/openai#image-models). Provider access and rates can change; check these sources before enabling or changing the provider.

## Construct artwork

Construct artwork uses the same swappable image provider and gold reservation machinery as adventure generation, through a separate service in `src/constructs/visual-generation.ts`. It creates no adventure and never enters the image gallery. Workshop conversation tests cannot call it. Generation is explicit; built-in presentation uses the committed artwork until the user customizes and requests generation.

`GET /api/constructs/visuals/generate?constructId=<UUID>&requestId=<optional UUID>` reads a quote and status without generation. `VisualGenerationQuote` reports `reservationGold`, `available`, `outdated`, optional `pendingRequestId` and optional `result`. Without a request UUID it recovers the latest pending request. Store a new UUID before submitting; after a lost connection use GET to recover status. For an accessible construct and an explicit request UUID with no claim, GET returns HTTP 200 with `result.status: "not-found"`. This differs from HTTP 404 for a missing or foreign construct. The UI may offer an explicit retry of the same UUID and payload, which remains safe if the original POST arrives late; it must not allocate a fresh UUID while resolving that request. A pending claim can remain pending after process interruption and is never automatically restarted.

`POST /api/constructs/visuals/generate` accepts `{constructId, requestId, description}`. The description must match the saved Visual description exactly. Save edits first. One canonical generation supplies all four roles; the avatar uses a centered crop. The text-only prompt data cannot grant actions or tools. Committed built-in artwork or the current generated canonical image conditions identity. Image bytes are decoded with bounded pixels and bytes, must be one square raster, and are re-encoded as WebP. No provider URLs or caller file paths are fetched.

Both request and response boundary schemas and types live in `src/constructs/visual-generation-contract.ts`. POST returns `VisualGenerationResult`: `status`, `reservationGold`, four role states, and optional `visual`. HTTP 200 covers `generated`, `pending`, `failed`, `unavailable`, `outOfGold` and `stale`; 404 covers inaccessible constructs, 400 malformed input, 401 signed-out requests and 500 unexpected infrastructure failures. GET uses the same error mapping and returns its quote on 200. A pending POST replay reads status only. Never poll POST. A failed request needs an explicit new UUID to retry; the same UUID with changed construct or description returns `stale` without a call or charge.

The claim captures the saved prompt, description and source revision, reserving 25 gold under the user's gold lock. Completion compares that revision before attachment. Concurrent requests for a construct make at most one provider call. Successful billed results settle actual cost, including stale completions. Ambiguous failures retain the reservation and prior artwork. Metadata edits use `editConstructMetadata` in `visual-edit-store.ts`: it locks the row and retains the latest references and framing. A nonempty saved description cannot be cleared. Generated visual metadata contains only a SHA-256 source fingerprint, never a second copy of the private prompt. Quotes compare that fingerprint to report outdated art.

Immutable bytes and destination grants live in separate additive tables. Construct clone, buy, listing publication/update and adventure creation save grants in their snapshot transactions. Retiring retains grants. Destination deletion releases only its grants; collection removes bytes only after the last grant disappears. This is separate from adventure image-gallery deletion. The migrations are additive and compatible with the live build.

Generated delivery requires the optional `destination` prop on `ConstructAvatar` and `ConstructIllustration`: `{kind: "construct" | "adventure" | "listing", id}`. Paths are same-origin and destination-scoped. Each delivery checks current owner/team/listing access, the grant and exact snapshot references in one query. Responses use `private, no-store`, `nosniff` and a sandbox policy; primitives bypass shared image optimization. No destination means initials for generated references. Source deletion leaves adventure, listing and bought-copy grants intact; unlisting revokes listing browsing while bought copies retain their independent access.
