# Instruction counter

Measure instructions and descriptive statements in one text file, with a separate count of content-bearing physical lines. The wrapper launches pi with `openai/gpt-6-luna`, validates the judge's result and derives the totals. It does not predict model performance or modify the input.

## Run

Install workspace dependencies with `npm ci` at the repository root. Requires Node 24, pi on `PATH`, and pi authentication for `openai/gpt-6-luna`.

If `pi-cliproxyapi` is installed in pi's agent directory, the counter explicitly loads it so it can use the same proxy-backed provider as an interactive pi session. No separate OpenAI API key is needed in that setup. The extension must already be configured, with its discovery cache populated by an interactive session. Otherwise, pi uses its ordinary stored credentials or `OPENAI_API_KEY`.

From the repository root:

```bash
node apps/instruction-counter/src/cli.ts path/to/file
```

Or use mise (the input path is relative to the app directory):

```bash
mise //apps/instruction-counter:count /absolute/path/to/file
```

From the app directory, `npm run --silent count -- /absolute/path/to/file` also works. Use the direct Node command or npm's silent option when consuming stdout; npm otherwise prints its own script banner.

The file's contents are sent to the model provider. Only inspect files you intend to disclose to that provider; do not pass secrets or `.env*` files.

## Output

A successful invocation emits exactly one compact JSON object followed by a newline. Diagnostics go to stderr. Here is a formatted example for readability; actual output occupies one physical line:

```json
{
  "filename": "/absolute/path/to/file",
  "instructionCount": 1,
  "descriptiveStatementCount": 0,
  "contentLineCount": 1
}
```

- Each instruction is one independently actionable requirement or preference. Repeated occurrences count separately, including instructions in quotations and examples. Conditions stay attached.
- Descriptive statements are counted separately. Comments, docstrings and embedded prompts can contain either category; executable operations and configuration settings are not natural-language statements.
- Content-bearing lines contain substantive prose or code, excluding blank and syntax-only lines. The judge decides what is substantive. A trailing line terminator does not create an extra physical line.
- `filename` is the absolute path of the input. Successful output contains only this field and the three totals—no findings, quotes, line numbers or model metadata.

Internally, the judge marks statements with source line ranges and identifies content-bearing line numbers. The wrapper validates the schema, statement-range bounds and nonblankness, and content-line uniqueness, bounds and nonblankness, then derives totals from the arrays. Those details are not emitted. The model does not have to transcribe exact quotes: normalizing Markdown while copying a quote caused valid analyses to be rejected. Range validation does not verify that a statement's meaning matches the cited lines. Semantic classification remains a model judgment and can vary between runs.

The input may use any extension. V1 accepts UTF-8 text (including an optional BOM); NUL-containing or invalid UTF-8 files are skipped with exit status 0 and one JSON line:

```json
{"filename":"/absolute/path/to/file","status":"skipped","reason":"binary"}
```

This is a conservative binary check, not a file-format detector; other text encodings are also skipped. Empty or whitespace-only text returns zero counts without invoking pi.

Inputs must be regular files, at most 128 KiB. Oversized inputs fail rather than being silently truncated or split. Pi has a five-minute timeout and a 16 MiB output buffer. Missing files, invalid model results and process failures exit 1 with diagnostics on stderr and no stdout result.

The judge has no tools, MCP servers, skills, prompt templates or discovered context files. Extension discovery is disabled, but the installed `pi-cliproxyapi` provider extension is explicitly allowed when present at `<agent-dir>/npm/node_modules/pi-cliproxyapi/index.ts`. The agent directory is `PI_CODING_AGENT_DIR`, or `~/.pi/agent` by default. In print mode, the proxy extension registers providers from its discovery cache without interactive discovery or polling.

The judge uses an ephemeral session and a dedicated system prompt, with automatic appended prompts suppressed. These controls limit actions and unrelated context; they do not guarantee immunity from classification errors or prompt injection. Pi still uses its configured provider credentials and model configuration. `--offline` disables startup catalog network activity, not the model request.

If the interactive pi session works but the counter reports a missing API key, check that the proxy extension is installed at the path above and its discovery cache is populated. `pi auth check` does not reflect this extension's runtime provider registration, so it can report missing credentials even when a proxy-backed session works.

## Tests

```bash
npm run check --workspace apps/instruction-counter
# or
mise //apps/instruction-counter:check
```

The tests are system tests in `test/system/`: each runs the CLI against a fake pi executable and makes no live model calls. They cover process arguments, single-line output, source-range validation, counts, binary skips, line endings and failure handling. They test the wrapper contract, not the model's semantic accuracy.

## Design

Considered a pi SDK session and a one-shot pi CLI process. The CLI process keeps this small tool independent of the SDK's session lifecycle and reuses the installed pi authentication. The report module owns validation and derived counts; the judge module owns model selection, prompt and request framing; the CLI owns filesystem and process access.
