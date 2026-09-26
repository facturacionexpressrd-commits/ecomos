import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { SetupStep } from "@/lib/setup";

/** Overview's first-run checklist. Renders nothing once every step is done. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="glass rise-in mb-6 p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-hi">Get set up</p>
        <span className="font-mono text-xs text-faint">
          {done}/{steps.length} done
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
                <span className="line-through">{s.label}</span>
              </div>
            ) : (
              <Link href={s.href} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
                <Circle size={18} className="shrink-0 text-faint" />
                <span className="flex-1">
                  <span className="block text-sm text-hi">{s.label}</span>
                  <span className="block text-xs text-lo">{s.hint}</span>
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
