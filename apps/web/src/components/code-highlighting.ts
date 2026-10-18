import {
  type CodeHighlighterPlugin,
  createCodePlugin,
  type ThemeInput,
} from "@streamdown/code";

// The colours of highlighted code: the token contract's code colours, as CSS
// variables, so code follows the site's theme and the mode the user chose
// rather than the operating system's. Streamdown asks for a light and a
// dark highlighting theme and picks between them by the operating system,
// so this one serves as both. The scopes are TextMate's.
const CODE_TOKEN_COLORS: ThemeInput = {
  name: "code-tokens",
  fg: "var(--foreground)",
  bg: "transparent",
  settings: [
    { settings: { foreground: "var(--foreground)" } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--code-comment)" },
    },
    {
      scope: ["keyword", "storage"],
      settings: { foreground: "var(--code-keyword)" },
    },
    {
      scope: ["string", "string.regexp"],
      settings: { foreground: "var(--code-string)" },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call.generic",
      ],
      settings: { foreground: "var(--code-function)" },
    },
    {
      scope: ["constant", "variable.parameter", "entity.name.type"],
      settings: { foreground: "var(--code-constant)" },
    },
  ],
};

// The site's code highlighter, which Streamdown colours code blocks with.
const CODE_HIGHLIGHTER: CodeHighlighterPlugin = createCodePlugin({
  themes: [CODE_TOKEN_COLORS, CODE_TOKEN_COLORS],
});

export { CODE_HIGHLIGHTER };
