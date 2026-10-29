// The rule for a project's name, shared by the New Project form and the
// buddy's create_project tool: trimmed, and at least one character.
import { z } from "zod";

const PROJECT_NAME: z.ZodString = z.string().trim().min(1);

export { PROJECT_NAME };
