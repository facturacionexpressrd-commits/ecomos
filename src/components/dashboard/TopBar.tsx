"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import { createClient } from "@/lib/supabase/client";

type StoreOption = { id: string; name: string; status: string };

/** Sits over the top of the banner: which store you're looking at, and who you're signed in as. */
export default function TopBar({ stores, email }: { stores: StoreOption[]; email: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative z-20 flex items-center justify-between gap-3">
      <div className="w-full max-w-64">
        <StoreSwitcher stores={stores} />
      </div>
      <div className="flex items-center gap-2">
        <span
          title={email}
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-hi uppercase"
        >
          {email.charAt(0) || "?"}
        </span>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          aria-label="Sign out"
          title="Sign out"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-faint hover:text-hi disabled:opacity-50"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
