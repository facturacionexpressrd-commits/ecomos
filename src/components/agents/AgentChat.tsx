"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import {
  Bot,
  CircleAlert,
  Clock,
  Info,
  Send,
  ShieldCheck,
  Telescope,
  Wrench,
  X,
} from "lucide-react";

type Activity = { tool: string; status: "ok" | "error"; detail?: string };
type Source = { labelKey: MessageKey; windowDays?: number };

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  activity?: Activity[];
  sources?: Source[];
  truncated?: boolean;
};

export type UnavailableSkill = { nameKey: MessageKey; descriptionKey: MessageKey; permission: string };

const SUGGESTION_KEYS: MessageKey[] = [
  "agent.suggestion1",
  "agent.suggestion2",
  "agent.suggestion3",
  "agent.suggestion4",
  "agent.suggestion5",
];

/** Clave de la etiqueta legible de cada herramienta, para la tira de actividad. */
const TOOL_LABEL_KEYS: Record<string, MessageKey> = {
  buscar_oportunidades_guardadas: "source.research",
  resumen_tienda: "source.storeMetrics",
  listar_productos: "source.catalog",
  listar_ordenes: "source.orders",
  problemas_fulfillment: "source.fulfillment",
  campanas_meta: "source.metaCampaigns",
  estado_integraciones: "source.integrations",
};

export default function AgentChat({
  storeId,
  storeName,
  unavailableSkills,
}: {
  storeId: string;
  storeName: string;
  unavailableSkills: UnavailableSkill[];
}) {
  const t = useT();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  // Visible al abrir la página y hasta que el usuario lo cierre. No se recuerda entre
  // visitas a propósito: el aviso de procesamiento de datos se muestra de más, nunca de menos.
  const [noticeVisible, setNoticeVisible] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;

    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", content: question };
    // El historial que viaja al servidor es solo lo que ya se mostró en pantalla.
    const history = turns.map((turn) => ({ role: turn.role, content: turn.content }));

    setTurns((current) => [...current, userTurn]);
    setDraft("");
    setSending(true);
    setError("");
    setRetryAfter(null);

    try {
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, message: question, history }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429) {
          const header = Number(response.headers.get("Retry-After"));
          setRetryAfter(Number.isFinite(header) && header > 0 ? header : null);
        }
        throw new Error(data.error || t("agent.failed"));
      }

      setTurns((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply || t("agent.noReply"),
          activity: Array.isArray(data.activity) ? data.activity : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          truncated: data.truncated === true,
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("agent.genericError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="glass rise-in p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold-hi">
              <Bot size={21} strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-hi">EcomOS Operator</h2>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-hi">
                  {t("agent.activeSkill")}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-lo">{t("agent.intro")}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-lo">
              <ShieldCheck size={14} className="text-teal" />
              {t("agent.readOnly")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-lo">
              {t("agent.storeAnalyzed")} <strong className="font-medium text-hi">{storeName}</strong>
            </span>
          </div>
        </div>

        {noticeVisible && (
          <div
            role="note"
            className="mt-5 flex items-start gap-3 rounded-xl border border-teal/30 bg-teal/10 px-3.5 py-3 text-sm leading-6 text-hi"
          >
            <Info size={16} className="mt-0.5 shrink-0 text-teal" />
            <p className="flex-1">{t("agent.notice", { store: storeName })}</p>
            <button
              type="button"
              onClick={() => setNoticeVisible(false)}
              aria-label={t("agent.noticeDismiss")}
              className="rounded-lg p-1 text-lo transition-colors hover:bg-white/10 hover:text-hi"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div aria-live="polite" className="mt-5 space-y-3">
          {turns.length === 0 && !sending && (
            <div className="rounded-xl border border-line bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-sm text-lo">{t("agent.startPrompt")}</p>
            </div>
          )}

          {turns.map((turn) =>
            turn.role === "user" ? (
              <div key={turn.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gold/15 px-3.5 py-2.5 text-sm leading-6 text-hi">
                  {turn.content}
                </p>
              </div>
            ) : (
              <div key={turn.id} className="space-y-2">
                {turn.activity && turn.activity.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {turn.activity.map((item, index) => (
                      <li
                        key={`${turn.id}-${item.tool}-${index}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                          item.status === "ok"
                            ? "border-line-hi text-lo"
                            : "border-coral/30 bg-coral/10 text-coral"
                        }`}
                      >
                        <Wrench size={11} />
                        {TOOL_LABEL_KEYS[item.tool] ? t(TOOL_LABEL_KEYS[item.tool]) : item.tool}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rounded-2xl rounded-bl-sm border border-line bg-white/[0.03] px-3.5 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-hi">{turn.content}</p>
                  {turn.sources && turn.sources.length > 0 && (
                    <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-5 text-faint">
                      {t("agent.sourcesUsed", {
                        sources: turn.sources
                          .map((source) =>
                            source.windowDays
                              ? `${t(source.labelKey)} · ${t("source.windowDays", { days: source.windowDays })}`
                              : t(source.labelKey)
                          )
                          .join(" · "),
                      })}
                    </p>
                  )}
                  {turn.truncated && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gold-hi">
                      <Clock size={11} />
                      {t("agent.truncated")}
                    </p>
                  )}
                </div>
              </div>
            )
          )}

          {sending && (
            <div className="rounded-2xl rounded-bl-sm border border-line bg-white/[0.03] px-3.5 py-3 text-sm text-lo">
              {t("agent.thinking")}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3.5 py-2.5 text-sm leading-6 text-coral"
          >
            <CircleAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              {error}
              {retryAfter !== null && ` ${t("agent.retryIn", { seconds: retryAfter })}`}
            </span>
          </p>
        )}

        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <label htmlFor="agent-message" className="sr-only">
            {t("agent.inputLabel")}
          </label>
          <textarea
            id="agent-message"
            rows={2}
            value={draft}
            maxLength={2000}
            disabled={sending}
            placeholder={t("agent.inputPlaceholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter envía, Shift+Enter salta de línea.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            className="min-h-[52px] flex-1 resize-y rounded-xl border border-line-hi bg-ink/60 px-3.5 py-2.5 text-sm leading-6 text-hi outline-none focus:border-gold/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-hi disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} />
            {sending ? t("agent.sending") : t("agent.send")}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={sending}
              onClick={() => void send(t(key))}
              className="rounded-xl border border-line-hi px-3 py-2 text-left text-xs text-lo transition-colors hover:border-gold/40 hover:text-hi disabled:opacity-50"
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass p-5">
        <h3 className="text-sm font-medium text-hi">{t("agent.cannotDo")}</h3>
        <p className="mt-1 text-xs leading-5 text-faint">{t("agent.cannotDoHint")}</p>
        <ul className="mt-3 space-y-2">
          {unavailableSkills.map((skill) => (
            <li key={skill.nameKey} className="flex flex-wrap items-baseline gap-x-2 text-xs leading-5">
              <span className="font-medium text-hi">{t(skill.nameKey)}</span>
              <span className="rounded-full border border-line-hi px-2 py-0.5 text-[10px] uppercase tracking-wide text-faint">
                {skill.permission === "never" ? t("agent.permission.never") : t("agent.permission.approval")}
              </span>
              <span className="text-lo">{t(skill.descriptionKey)}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard/research"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-gold-hi hover:text-hi"
        >
          <Telescope size={14} />
          {t("agent.openResearch")}
        </Link>
      </div>
    </section>
  );
}
