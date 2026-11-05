// The rule for a new project's name, shared by the New Project form, the
// new-chat form's name dialog and the construct's create_project tool: trimmed,
// at least one character and at most PROJECT_NAME_MAX_LENGTH. Its length is
// counted in UTF-16 code units, as an input's maxLength counts, so the
// browser and the server agree; an emoji takes 2 or more. A ProjectName
// has passed it, so only a checked name starts a project. Names saved before
// the limit may be longer; they are kept and shown as they are.
import { z } from "zod";

// Long enough for any name a user would call a project, short enough that
// a name can't carry a message of its own in the site's emails.
const PROJECT_NAME_MAX_LENGTH = 80;

const PROJECT_NAME = z
  .string()
  .trim()
  .min(1, { error: "A quest needs a name." })
  .check((context) => {
    // zod's own max counts code points, so it is checked here instead.
    if (context.value.length > PROJECT_NAME_MAX_LENGTH) {
      context.issues.push({
        code: "too_big",
        origin: "string",
        maximum: PROJECT_NAME_MAX_LENGTH,
        inclusive: true,
        input: context.value,
        message: `A quest name has at most ${PROJECT_NAME_MAX_LENGTH} characters. Choose a shorter one.`,
      });
    }
  })
  .brand<"ProjectName">();

type ProjectName = z.infer<typeof PROJECT_NAME>;

// The text as a project's name, or why it can't be one: it is empty or only
// spaces, or longer than PROJECT_NAME_MAX_LENGTH once trimmed.
type ProjectNameCheck =
  | { readonly kind: "named"; readonly name: ProjectName }
  | { readonly kind: "missing" | "tooLong" };

function checkProjectName(text: string): ProjectNameCheck {
  const parsed = PROJECT_NAME.safeParse(text);
  if (parsed.success) {
    return { kind: "named", name: parsed.data };
  }
  if (parsed.error.issues.some(({ code }) => code === "too_big")) {
    return { kind: "tooLong" };
  }
  return { kind: "missing" };
}

export type { ProjectName, ProjectNameCheck };
export { checkProjectName, PROJECT_NAME, PROJECT_NAME_MAX_LENGTH };
