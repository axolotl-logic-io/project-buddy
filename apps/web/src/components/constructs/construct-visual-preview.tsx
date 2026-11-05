import type { JSX } from "react";
import {
  ConstructAvatar,
  ConstructIllustration,
} from "@/components/constructs/construct-visual.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import {
  VISUAL_ROLE,
  type VisualDestination,
  type VisualRole,
} from "@/constructs/visual.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";

function ConstructVisualPreview({
  construct,
  destination,
  roles,
}: {
  readonly construct: ConstructSnapshot;
  readonly destination?: VisualDestination | undefined;
  readonly roles?:
    | Readonly<Record<VisualRole, "pending" | "generated" | "failed">>
    | undefined;
}): JSX.Element {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-4">
      {VISUAL_ROLE.options.map((role) => (
        <figure className="flex min-w-0 flex-col gap-2" key={role}>
          <figcaption className="field-label">
            {VISUAL_COPY.roles[role]}
          </figcaption>
          {roles !== undefined && (
            <p className="text-muted text-sm">
              {VISUAL_COPY.roleStates[roles[role]]}
            </p>
          )}
          {role === "avatar" && (
            <ConstructAvatar construct={construct} destination={destination} />
          )}
          {role !== "avatar" && (
            <ConstructIllustration
              construct={construct}
              destination={destination}
              visualRole={role}
            />
          )}
        </figure>
      ))}
    </div>
  );
}

export { ConstructVisualPreview };
