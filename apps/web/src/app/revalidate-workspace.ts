import { revalidatePath } from "next/cache";

// Workspace data is shared across pages and the header. Revalidate the root
// layout so Back, Forward and prefetched links all see the saved data.
function revalidateWorkspace(): void {
  revalidatePath("/", "layout");
}

export { revalidateWorkspace };
