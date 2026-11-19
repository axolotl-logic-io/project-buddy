import { z } from "zod";
import { HTTP_STATUS } from "@/http-status.ts";
import { themeChoiceCookie } from "@/themes/theme-choice.ts";
import { THEME_IDS, THEME_MODES } from "@/themes/themes.ts";

const CHOICE = z.object({
  theme: z.enum(THEME_IDS),
  mode: z.enum(THEME_MODES),
});

// Saves only this browser's appearance. Signed-out pages use this route too.
export async function PUT(request: Request): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: HTTP_STATUS.forbidden });
  }
  const contentType = request.headers.get("content-type")?.split(";").at(0);
  if (contentType !== "application/json") {
    return new Response(null, { status: HTTP_STATUS.badRequest });
  }
  const raw: unknown = await request.json().catch(() => undefined);
  const choice = CHOICE.safeParse(raw);
  if (!choice.success) {
    return new Response(null, { status: HTTP_STATUS.badRequest });
  }
  const { name, value, path, sameSite, maxAge } = themeChoiceCookie(
    choice.data,
  );
  return new Response(null, {
    status: HTTP_STATUS.noContent,
    headers: {
      "set-cookie": `${name}=${value}; Path=${path}; SameSite=${sameSite}; Max-Age=${maxAge}`,
    },
  });
}
