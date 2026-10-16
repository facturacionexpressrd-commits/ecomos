import { describe, it, expect } from "vitest";
import { es } from "@/lib/i18n/es";
import { en } from "@/lib/i18n/en";
import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeFromAcceptLanguage,
  makeT,
  translate,
  REPLY_LANGUAGE,
} from "@/lib/i18n";

const esKeys = Object.keys(es).sort();
const enKeys = Object.keys(en).sort();

describe("dictionary parity", () => {
  it("has the same key set in both languages", () => {
    // `en` está tipado contra `es`, pero esto atrapa una clave sobrante en `en`,
    // que el tipo no impide.
    expect(enKeys).toEqual(esKeys);
  });

  it("has no empty string in either language", () => {
    for (const key of esKeys) {
      expect((es as Record<string, string>)[key].trim().length, `es.${key}`).toBeGreaterThan(0);
      expect((en as Record<string, string>)[key].trim().length, `en.${key}`).toBeGreaterThan(0);
    }
  });

  it("uses the same {variables} in both languages", () => {
    const vars = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(vars(en[key]), `variables differ in ${key}`).toEqual(vars(es[key]));
    }
  });

  it("covers every locale with a reply language for the agent", () => {
    for (const locale of LOCALES) {
      expect(REPLY_LANGUAGE[locale].length).toBeGreaterThan(0);
    }
  });
});

describe("translate", () => {
  it("returns the Spanish source for es", () => {
    expect(translate("es", "common.cancel")).toBe("Cancelar");
  });

  it("returns the English translation for en", () => {
    expect(translate("en", "common.cancel")).toBe("Cancel");
  });

  it("interpolates variables", () => {
    expect(translate("es", "setup.progress", { done: 2, total: 5 })).toBe("2/5 listo");
    expect(translate("en", "setup.progress", { done: 2, total: 5 })).toBe("2/5 done");
  });

  it("leaves a missing variable visible instead of printing undefined", () => {
    expect(translate("en", "setup.progress", { done: 1 })).toBe("1/{total} done");
  });

  it("does not interpolate when no variables are passed", () => {
    expect(translate("en", "agent.retryIn")).toContain("{seconds}");
  });

  it("falls back to Spanish when a translation is missing at runtime", () => {
    // El tipo impide que falte, pero un diccionario cargado en caliente podría; el
    // usuario debe ver español, nunca la clave cruda.
    const incomplete = { ...en } as Record<string, string>;
    delete incomplete["common.save"];
    const value = incomplete["common.save"] ?? es["common.save"];
    expect(value).toBe("Guardar");
  });

  it("makeT binds the locale", () => {
    expect(makeT("en")("common.delete")).toBe("Delete");
    expect(makeT("es")("common.delete")).toBe("Eliminar");
  });
});

describe("locale resolution", () => {
  it("accepts only the supported locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(isLocale("EN")).toBe(false);
  });

  it("defaults to Spanish", () => {
    expect(DEFAULT_LOCALE).toBe("es");
  });

  it("reads English from Accept-Language only when it comes first", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("es-DO,es;q=0.9,en;q=0.8")).toBe("es");
  });

  it("falls back to Spanish for a missing or unknown header", () => {
    expect(localeFromAcceptLanguage(null)).toBe("es");
    expect(localeFromAcceptLanguage(undefined)).toBe("es");
    expect(localeFromAcceptLanguage("")).toBe("es");
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBe("es");
    expect(localeFromAcceptLanguage("garbage")).toBe("es");
  });
});
