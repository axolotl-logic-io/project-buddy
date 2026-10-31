import { redirect } from "next/navigation";
import { HOME_PATH } from "@/routes.ts";

// "/" is the new chat page, at its own address.
export default function Home(): never {
  return redirect(HOME_PATH);
}
