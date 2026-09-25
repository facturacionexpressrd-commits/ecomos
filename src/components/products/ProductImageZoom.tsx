"use client";

import { useRef } from "react";
import { X } from "lucide-react";

// Shopify's CDN resizes via ?width=; plain <img> keeps it off Vercel's image optimizer like ProductThumb.
const resized = (src: string, width: number) => `${src}${src.includes("?") ? "&" : "?"}width=${width}`;

/** Product photo that opens full-size in a native <dialog> (Esc, backdrop click or × to close). */
export default function ProductImageZoom({ url, alt }: { url: string; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="group relative block size-40 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-line bg-white/5"
        aria-label={`Enlarge image of ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resized(url, 320)} alt={alt} className="size-full object-cover transition-transform group-hover:scale-105" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto max-h-[92vh] max-w-[92vw] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resized(url, 1600)} alt={alt} className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain" />
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="absolute -top-3 -right-3 rounded-full bg-ink p-1.5 text-hi shadow-lg"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </dialog>
    </>
  );
}
