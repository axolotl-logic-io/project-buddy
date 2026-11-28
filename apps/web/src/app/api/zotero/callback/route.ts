import { NextResponse } from "next/server";
import { currentUser } from "@/auth/current-user.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { finishZoteroConnection } from "@/zotero/zotero-connection.ts";

// Where Zotero sends the user once they approved or declined access to
// their library, with the temporary token this site gave them. Finishes
// connecting their account on the server, then sends them back to the
// page they started from.
export async function GET(request: Request): Promise<Response> {
  const user = await currentUser();
  if (user === undefined) {
    return NextResponse.redirect(
      new URL(SIGN_IN_PATH, request.url),
      HTTP_STATUS.seeOther,
    );
  }
  const query = new URL(request.url).searchParams;
  const back = await finishZoteroConnection(user.id, {
    token: query.get("oauth_token") ?? "",
    verifier: query.get("oauth_verifier") ?? undefined,
  });
  return NextResponse.redirect(
    new URL(back, request.url),
    HTTP_STATUS.seeOther,
  );
}
