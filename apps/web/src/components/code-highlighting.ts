import type {
  CodeHighlighterPlugin,
  HighlightOptions,
  HighlightResult,
} from "@streamdown/code";
import { bundledLanguages, bundledLanguagesInfo } from "shiki/langs";
import { CODE_TOKEN_COLORS } from "@/components/code-theme.ts";

function isLanguage(value: string): value is HighlightOptions["language"] {
  return Object.hasOwn(bundledLanguages, value);
}

const LANGUAGES = bundledLanguagesInfo.map(({ id }) => id).filter(isLanguage);
const LANGUAGE_NAMES = new Set(
  bundledLanguagesInfo.flatMap(({ id, aliases = [] }) => [id, ...aliases]),
);
let engine: Promise<CodeHighlighterPlugin> | undefined;
let readyEngine: CodeHighlighterPlugin | undefined;

function loadEngine(): Promise<CodeHighlighterPlugin> {
  engine ??= import("@/components/code-highlighting-engine.ts").then(
    ({ CODE_ENGINE }) => {
      readyEngine = CODE_ENGINE;
      return CODE_ENGINE;
    },
  );
  return engine;
}

function keepPlainCode(): void {
  // Code remains readable when the optional highlighting chunk cannot load.
}

// Streamdown already renders plain code while highlighting is pending. Load
// the regex engine only for a code block, keeping prose and editors independent
// of its download and evaluation. Each request keeps its own completion callback.
function highlight(
  options: HighlightOptions,
  callback?: (result: HighlightResult) => void,
): HighlightResult | null {
  if (readyEngine !== undefined) {
    return readyEngine.highlight(options, callback);
  }
  loadEngine()
    .then((loaded) => {
      const result = loaded.highlight(options, callback);
      if (result !== null) {
        callback?.(result);
      }
    })
    .catch(keepPlainCode);
  return null;
}

const CODE_HIGHLIGHTER: CodeHighlighterPlugin = {
  name: "shiki",
  type: "code-highlighter",
  getSupportedLanguages: () => [...LANGUAGES],
  getThemes: () => [CODE_TOKEN_COLORS, CODE_TOKEN_COLORS],
  supportsLanguage: (language: HighlightOptions["language"]) =>
    LANGUAGE_NAMES.has(language.trim().toLowerCase()),
  highlight,
};

export { CODE_HIGHLIGHTER };
