import type { JSX } from "react";
import { ConstructIllustration } from "@/components/constructs/construct-visual.tsx";
import type { Construct } from "@/constructs/construct.ts";
import { VISUAL_ROLE } from "@/constructs/visual.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";

// Each role's framing at one size, side by side, so the avatar's crop can be
// compared with the other roles. The avatar keeps its circle.
function ConstructVisualPreview({
  construct,
}: {
  readonly construct: Construct;
}): JSX.Element {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-4">
      {VISUAL_ROLE.options.map((role) => (
        <figure className="flex min-w-0 flex-col gap-2" key={role}>
          <figcaption className="field-label">
            {VISUAL_COPY.roles[role]}
          </figcaption>
          <ConstructIllustration construct={construct} visualRole={role} />
        </figure>
      ))}
    </div>
  );
}

export { ConstructVisualPreview };
