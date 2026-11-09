import { createCodePlugin } from "@streamdown/code";
import { CODE_TOKEN_COLORS } from "@/components/code-theme.ts";

const CODE_ENGINE = createCodePlugin({
  themes: [CODE_TOKEN_COLORS, CODE_TOKEN_COLORS],
});

export { CODE_ENGINE };
