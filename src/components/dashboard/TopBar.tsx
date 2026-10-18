"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/dashboard/LanguageSwitcher";
import NightModeToggle, { type Theme } from "@/components/dashboard/NightModeToggle";
import { useT } from "@/lib/i18n/client";

type StoreOption = { id: string; name: string; status: string };

export default function TopBar({
  stores,
  email,
  theme,
}: {
  stores: StoreOption[];
  email: string;
  theme: Theme;
}) {
  const router = useRouter();
  const t = useT();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <div className="w-full max-w-72">
        <StoreSwitcher stores={stores} />
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <NightModeToggle current={theme} />
        <span
          title={email}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-medium uppercase text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        >
          {email.charAt(0) || "?"}
        </span>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          aria-label={t("topbar.signOut")}
          title={t("topbar.signOut")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
