"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check, Store as StoreIcon } from "lucide-react";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";

type StoreOption = { id: string; name: string; status: string };

export default function StoreSwitcher({ stores }: { stores: StoreOption[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const requested = searchParams.get("store");
  const currentStoreId = requested && stores.some((s) => s.id === requested) ? requested : stores[0]?.id;
  const current = stores.find((s) => s.id === currentStoreId);

  function switchTo(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("store", storeId);
    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (stores.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-line-hi bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/8"
      >
        <StoreIcon size={15} className="shrink-0 text-gold-hi" strokeWidth={1.75} />
        <span className="flex-1 truncate text-hi">{current?.name ?? "Select store"}</span>
        <ChevronDown size={15} className="shrink-0 text-faint" />
      </button>

      {open && (
        <div className="glass absolute left-0 z-20 mt-2 w-72 overflow-hidden p-1.5">
          <ul className="max-h-64 overflow-y-auto">
            {stores.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => switchTo(s.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/8 ${
                    s.id === currentStoreId ? "text-hi" : "text-lo"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.id === currentStoreId && <Check size={14} className="shrink-0 text-teal" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-line p-2.5">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-faint uppercase">Connect another store</p>
            <ConnectStoreForm compact />
          </div>
        </div>
      )}
    </div>
  );
}
