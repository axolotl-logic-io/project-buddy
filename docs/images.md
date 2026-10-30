# Images

## Image generation

A buddy can call `generate_image` when the user asks for an image. The tool creates at most one 1024×1024 image per user message at low quality, using a prompt of at most 1000 characters. It requests WebP output at compression 80 to fit the shared image store's size limit. The result appears in the chat and in the owner's Image gallery, with the prompt, download link and source chat.

The provider is OpenAI's `gpt-image-2`, through the Vercel AI SDK's image-model interface. The image provider lives in `apps/web/src/images/image-provider.ts`; it is independent of the chat provider. A replacement provider implements `ImageProvider` and must update the reservation and pricing together. The chat model remains swappable through the AI SDK.

## Configure the provider

Set `OPENAI_API_KEY` in the site's environment using the platform's secret controls. For local development, use the ignored `apps/web/.env.local`. Do not put credentials in commits, logs or issue comments. The OpenAI account needs image-model access and sufficient billing credit; account verification may be required. The real image provider is also disabled when `BUDDY_MODEL=mock`; tests inject a fake provider. Missing credentials leave text chat available and make generation return an unavailable result.

No storage credential is needed. Generation reuses the upload feature's `images/store.ts`, private Postgres image rows and authenticated delivery boundary. Both features validate supported image bytes and share chat ownership. Provider URLs are never used as persistent image storage or fetched from user input.

## Quota and billing

The quota is $5 per user per UTC calendar month, shared by chat and images. Generation atomically reserves $0.25 before a provider call, while locking the user's monthly spend row. Concurrent image requests cannot each spend the same remaining balance. A durable claim for the answered user message prevents repeated tool calls or reply retries from generating or charging twice, even if the model assigns a new tool-call identifier.

Successful calls replace the reservation with reported spending, rounded up to micro-USD: text input tokens × 2.5 plus image output tokens × 15. These rates are $2.50 and $15 per million tokens. Text-only prompts, one low-quality square output and no automatic retries bound each request. Review rates and the reservation before changing the model, dimensions, quality or prompt limit.

A timeout, missing usage, provider failure or persistence failure retains the reservation because the provider might have billed the request. The provider timeout is two minutes. A process interrupted before completion leaves a pending entry in the gallery and never restarts automatically. Check provider billing before making a manual accounting correction. A known image saved successfully uses its actual charge, even if the chat reply subsequently fails. Reservations settle in their original month across a UTC month boundary. The existing chat quota permits an already-running chat call to finish and cross the limit; image generation does not change that policy.

## Ownership and deletion

Gallery queries and image delivery derive the owner from the session. Image responses are private and non-cacheable; knowing another user's identifier grants no access. Generation metadata records the source chat and prompt. The gallery shows up to 40 entries per page, newest first.

Images belong to their source chat. Database cascades delete image bytes and generation metadata with the chat, its project or the account. There is no independent image-delete control. Deleting an image's source never refunds spending. Copies already downloaded remain with the user.

## Validation

Tests use fake generation providers and the guarded local test database. Never use the shared database or a real paid model to test generation. The server suite covers tool calls, persistence, delivery, quota concurrency, replay and owner isolation. Browser tests cover progress, errors, gallery links and phone layout.

## Provider references

Configuration and rates were checked on 2026-10-30 against the [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), and [AI SDK OpenAI image models](https://ai-sdk.dev/providers/ai-sdk-providers/openai#image-models). Provider access and rates can change; check these sources before enabling or changing the provider.
