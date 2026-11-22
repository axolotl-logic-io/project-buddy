import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { RiteEditor } from "@/components/rite-editor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { changeRiteAction, copyRiteAction } from "@/rites/rite-actions.ts";
import { readRite } from "@/rites/rite-store.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

async function RitePage({
  params,
}: PageProps<"/grimoire/[riteId]">): Promise<JSX.Element> {
  const [user, { riteId }] = await Promise.all([requireUser(), params]);
  if (riteId === "new") {
    return <RiteEditor viewer={user.id} />;
  }
  const rite = await readRite(user.id, riteId, true);
  if (rite === undefined) {
    notFound();
  }
  return (
    <div className="grid gap-3">
      {rite.source === "own" && rite.forgotten !== true && (
        <RiteEditor viewer={user.id} rite={rite} />
      )}
      {(rite.source === "built-in" || rite.forgotten === true) && (
        <ol className="grid gap-3">
          {Array.from(new Set(rite.replies)).map((reply) => (
            <li key={reply} className="whitespace-pre-wrap">
              {reply}
            </li>
          ))}
        </ol>
      )}
      {rite.forgotten !== true && (
        <form action={copyRiteAction}>
          <input type="hidden" name="id" value={rite.id} />
          <Button type="submit" variant="secondary">
            {GRIMOIRE_COPY.copy}
          </Button>
        </form>
      )}
      {rite.source === "own" && (
        <form action={changeRiteAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="id" value={rite.id} />
          {rite.forgotten === true && (
            <>
              <Button
                type="submit"
                name="change"
                value="restore"
                variant="secondary"
              >
                {GRIMOIRE_COPY.restore}
              </Button>
              <Button
                type="submit"
                name="change"
                value="delete"
                variant="danger"
              >
                {GRIMOIRE_COPY.delete}
              </Button>
            </>
          )}
          {rite.forgotten !== true && (
            <Button
              type="submit"
              name="change"
              value="forget"
              variant="quiet-danger"
            >
              {GRIMOIRE_COPY.forget}
            </Button>
          )}
        </form>
      )}
    </div>
  );
}

export default RitePage;
