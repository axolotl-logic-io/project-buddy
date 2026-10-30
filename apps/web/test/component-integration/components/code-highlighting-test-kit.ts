import type { HighlightOptions } from "@streamdown/code";
import { CODE_HIGHLIGHTER } from "@/components/code-highlighting.ts";

// Resolves once the site's code highlighter can colour language, with no
// clock of its own: Shiki has imported the grammar and built the
// highlighter that Streamdown's code blocks share, so a test's clocked wait
// for coloured code covers only rendering. The highlighter keeps one
// instance per language and themes, and Streamdown asks it with these
// themes. A result it already has comes back at once and never calls back.
function loadCodeHighlighting(
  language: HighlightOptions["language"],
): Promise<void> {
  const loaded = Promise.withResolvers<void>();
  const cached = CODE_HIGHLIGHTER.highlight(
    { code: "", language, themes: CODE_HIGHLIGHTER.getThemes() },
    () => loaded.resolve(),
  );
  if (cached !== null) {
    loaded.resolve();
  }
  return loaded.promise;
}

export { loadCodeHighlighting };
