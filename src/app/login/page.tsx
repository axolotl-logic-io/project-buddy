import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in · Project Buddy",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-semibold text-4xl tracking-tight">Project Buddy</h1>
      <LoginForm />
    </main>
  );
}
