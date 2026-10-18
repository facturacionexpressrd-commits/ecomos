"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type Theme = "light" | "dark";

export default function NightModeToggle({ current }: { current: Theme }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Theme = current === "light" ? "dark" : "light";

  function toggle() {
    // Mutate the attribute instantly so the paint flips before the server round-trip finishes.
    const scope = document.querySelector<HTMLElement>("[data-theme]");
    if (scope) scope.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  const Icon = current === "light" ? Moon : Sun;
  const label = current === "light" ? "Modo noche" : "Modo día";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
    >
      <Icon size={15} strokeWidth={1.75} />
    </button>
  );
}
