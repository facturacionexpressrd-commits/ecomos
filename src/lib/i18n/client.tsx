"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type T } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Lo monta el layout del panel con el idioma ya resuelto en el servidor. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): T {
  return makeT(useContext(LocaleContext));
}
