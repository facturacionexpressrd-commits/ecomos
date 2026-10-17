"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, Check } from "lucide-react";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n";

/**
 * Cambia el idioma de la interfaz. La Server Action guarda la cookie y revalida el layout;
 * `router.refresh()` vuelve a pedir los Server Components ya traducidos.
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={pending}
        aria-label={t("topbar.changeLanguage")}
        title={t("topbar.language")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-lo hover:text-hi disabled:opacity-50"
      >
        <Languages size={15} strokeWidth={1.75} />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="glass absolute right-0 z-30 mt-2 w-40 overflow-hidden p-1.5"
          // Cerrar al salir con el teclado deja el foco donde el usuario lo tenía.
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
          }}
        >
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              onClick={() => choose(option)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/8 ${
                option === locale ? "text-hi" : "text-lo"
              }`}
            >
              {t(option === "es" ? "lang.es" : "lang.en")}
              {option === locale && <Check size={14} className="shrink-0 text-teal" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
