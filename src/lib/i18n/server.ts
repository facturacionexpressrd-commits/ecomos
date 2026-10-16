import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  makeT,
  type Locale,
  type MessageKey,
  type T,
  type Vars,
} from "./index";

/**
 * Idioma de la petición, en el servidor. Orden: cookie → Accept-Language → español.
 *
 * No se guarda en la base de datos: `User` no tiene columna de preferencias y añadir
 * una exigiría una migración para algo que la cookie resuelve. Si alguna vez hace falta
 * que la preferencia siga al usuario entre dispositivos, se añade aquí sin tocar las páginas.
 *
 * `cache()`: se resuelve una vez por petición aunque lo pidan el layout y varias páginas.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const requestHeaders = await headers();
  return localeFromAcceptLanguage(requestHeaders.get("accept-language")) ?? DEFAULT_LOCALE;
});

export async function getT(): Promise<T> {
  return makeT(await getLocale());
}

/** Atajo para traducir un solo mensaje en un Server Component o Server Action. */
export async function tr(key: MessageKey, vars?: Vars): Promise<string> {
  return (await getT())(key, vars);
}
