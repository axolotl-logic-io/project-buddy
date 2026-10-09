const linkClassName =
  "underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100";

// The Blender Reference Manual is CC BY-SA 4.0; its license requires this attribution.
export function SiteFooter() {
  return (
    <footer className="px-6 py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
      <p>
        Includes content adapted from the{" "}
        <a
          className={linkClassName}
          href="https://docs.blender.org/manual/en/latest/"
        >
          Blender Reference Manual
        </a>
        , licensed under{" "}
        <a
          className={linkClassName}
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          rel="license"
        >
          CC BY-SA 4.0
        </a>
        .
      </p>
    </footer>
  );
}
