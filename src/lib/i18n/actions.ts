"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale, type Locale } from "./index";

/**
 * Cambia el idioma de la interfaz. Solo cookie (un año): `User` no tiene columna de
 * preferencias y la cookie ya sirve antes de iniciar sesión. `revalidatePath` fuerza a
 * que los Server Components se vuelvan a renderizar con el nuevo idioma.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
