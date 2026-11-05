import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { VisualRole } from "@/constructs/visual.ts";

interface ConstructIllustrationProps {
  readonly construct: ConstructSnapshot;
  readonly visualRole: VisualRole;
  /** Omit for a named image; true hides art adjacent to the construct's name. */
  readonly decorative?: boolean | undefined;
}
interface ConstructAvatarProps {
  readonly construct: ConstructSnapshot;
  readonly size?: 32 | 40;
  readonly decorative?: boolean | undefined;
}

export type { ConstructAvatarProps, ConstructIllustrationProps };
