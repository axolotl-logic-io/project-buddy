# Local constructs

Project Buddy makes no requests to AI model companies. Constructs run a local command engine inspired by multi-user dungeons (MUDs): users type a verb, the harness executes an allowed action, and the construct reports its result.

## Commands

| Command | Result |
| --- | --- |
| `help` | List supported commands. |
| `look` | Show the conversation's starting context when present. |
| `search <query>` | Search the local Blender manual index, save citations and show excerpts. |
| `cast <spell id>` | Use the existing owner-scoped spell tool and save the cast. |

Verbs ignore case and accept an optional leading `/`. Missing arguments get usage instructions. Other messages remain saved and receive command help. Test-only `/mock-*` commands are unavailable in the local engine. Plan commands and controls continue to work through their existing path.

## Retained architecture

`src/replies/model.ts` selects local rules by default, including in production. `src/replies/local-model.ts` owns command behavior. `src/replies/scripted-model.ts` adapts rule outputs to the existing SDK stream protocol. It also transports the opt-in mock scripts used by tests. The SDK does not contact a provider by itself.

Replies keep the existing context assembly, streaming, tool execution, ownership checks and persistence. Search and cast use their existing tool contracts; the engine never dispatches arbitrary tool names or JSON from chat text. No schema migration is needed.

Local replies report zero tokens and bypass provider spend metering. The existing balance check remains part of the harness, so an exhausted account still cannot start a reply. Mock tests retain simulated spending to exercise accounting.

## Initial limits

The engine does not infer intent, interpret prose instructions, understand attached images, update plans, change activities or propose quest-status changes. Construct, activity and spell definitions and conversation snapshots remain saved. Casting a spell records its use but does not execute its instructions. Use the Plan and progress controls for manual edits. Prepared openings remain as saved; generated openings use command help.

Remote image generation and avatar framing are disabled at their factories, even if old API credentials remain configured. Existing artwork, image uploads and galleries remain available. Image generation follows the existing unavailable-provider behavior.

## Configuration

Unset `CONSTRUCT_MODEL` or set it to `local`. `mock` remains available outside production for existing test commands. Remote settings, including the former `claude` setting, fail closed. Remove that setting before deploying; no API key is required. The Anthropic and OpenAI provider packages are removed from the app's dependencies.
