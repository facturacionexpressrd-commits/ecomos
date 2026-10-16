/**
 * Internacionalización de la interfaz de EcomOS.
 *
 * Sin librería: dos diccionarios planos y una función, el mismo patrón que ya
 * usa el otro proyecto del dueño. `es` es la fuente de verdad; `en` está tipado
 * contra sus claves, así que una clave nueva sin traducir no compila.
 * Interpolación con {nombre}.
 *
 * Esto traduce la interfaz, no las respuestas del agente: el idioma en el que
 * Claude contesta se le indica en el prompt del sistema (ver src/lib/agents/loop.ts).
 */
import { es } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";
export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "ecomos_idioma";

export type MessageKey = keyof typeof es;
export type Vars = Record<string, string | number>;
export type T = (key: MessageKey, vars?: Vars) => string;

const DICTS: Record<Locale, Record<MessageKey, string>> = { es, en };

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

/** Nombre del idioma en el que Claude debe responder, para el prompt del sistema. */
export const REPLY_LANGUAGE: Record<Locale, string> = {
  es: "español",
  en: "English",
};

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  // Cae a español si por cualquier razón falta la clave traducida en tiempo de ejecución.
  const raw = DICTS[locale][key] ?? es[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}

/** Elige el idioma a partir de Accept-Language ("en-US,en;q=0.9,es;q=0.8"). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en") ? "en" : DEFAULT_LOCALE;
}
