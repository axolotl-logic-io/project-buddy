import { redirect } from "next/navigation";
import { HOME_PATH } from "@/routes.ts";

// The root and sign-in destinations share the atlas homepage.
export default function Home(): never {
  return redirect(HOME_PATH);
}
