import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { VisualDestination, VisualRole } from "@/constructs/visual.ts";

interface ConstructIllustrationProps {
  readonly construct: ConstructSnapshot;
  readonly destination?: VisualDestination | undefined;
  readonly visualRole: VisualRole;
  /** Maximum displayed square width in CSS pixels, before frame zoom. */
  readonly displayWidth?: number;
  /** Omit for a named image; true hides art adjacent to the construct's name. */
  readonly decorative?: boolean | undefined;
}
interface ConstructAvatarProps {
  readonly construct: ConstructSnapshot;
  readonly destination?: VisualDestination | undefined;
  readonly size?: 32 | 40;
  readonly decorative?: boolean | undefined;
}

export type { ConstructAvatarProps, ConstructIllustrationProps };
