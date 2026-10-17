import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { SetupStep } from "@/lib/setup";
import { getT } from "@/lib/i18n/server";

/** Lista de primera vez del Resumen. No muestra nada cuando todos los pasos están listos. */
export async function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const t = await getT();

  return (
    <section className="glass rise-in mb-6 p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-hi">{t("setup.title")}</p>
        <span className="font-mono text-xs text-faint">
          {t("setup.progress", { done, total: steps.length })}
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gold" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="flex flex-col gap-1">
        {steps.map((s) => (
          <li key={s.key}>
            {s.done ? (
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-faint">
                <CheckCircle2 size={18} className="shrink-0 text-teal" />
                <span className="line-through">{t(s.labelKey)}</span>
              </div>
            ) : (
              <Link href={s.href} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
                <Circle size={18} className="shrink-0 text-faint" />
                <span className="flex-1">
                  <span className="block text-sm text-hi">{t(s.labelKey)}</span>
                  <span className="block text-xs text-lo">{t(s.hintKey, s.hintVars)}</span>
                </span>
                <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
