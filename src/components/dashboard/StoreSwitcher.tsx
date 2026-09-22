"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";

type StoreOption = { id: string; name: string; status: string };

export default function StoreSwitcher({ stores, currentStoreId }: { stores: StoreOption[]; currentStoreId: string }) {
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

  const current = stores.find((s) => s.id === currentStoreId);

  function switchTo(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("store", storeId);
    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative ml-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
      >
        <span className="max-w-[12rem] truncate">{current?.name ?? "Select store"}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            {stores.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => switchTo(s.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    s.id === currentStoreId ? "font-medium" : ""
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.id === currentStoreId && <span className="text-gray-400">✓</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Connect another store</p>
            <ConnectStoreForm compact />
          </div>
        </div>
      )}
    </div>
  );
}
