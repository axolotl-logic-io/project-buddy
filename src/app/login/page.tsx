import type { Metadata } from "next";
import type { JSX } from "react";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { LoginForm } from "./login-form.tsx";

export const metadata: Metadata = {
  title: LOGIN_COPY.title,
};

export default function LoginPage(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="panel flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="site-title">{SITE_COPY.name}</h1>
          <p className="text-muted">{LOGIN_COPY.intro}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
