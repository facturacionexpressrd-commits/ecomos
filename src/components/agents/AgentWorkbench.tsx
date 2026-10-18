"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CircleAlert,
  MessageSquarePlus,
  Search,
  Send,
  Trash2,
  Wrench,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

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

type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: Turn[];
};

const STORAGE_KEY = (storeId: string) => `ecomos:agent-threads:${storeId}`;

// Module-scoped monotonic counter so Thread/Turn ids don't require Date.now() inside the
// component body (the React 19 purity rule flags Date.now() as impure during render even when
// it's reached from an event handler closure).
let _idSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++_idSeq}-${Math.floor(Math.random() * 1e4)}`;

const SUGGESTION_KEYS: MessageKey[] = [
  "agent.suggestion1",
  "agent.suggestion2",
  "agent.suggestion3",
  "agent.suggestion4",
  "agent.suggestion5",
];

function newThread(): Thread {
  const now = Date.now();
  return { id: nextId("t"), title: "Nueva conversación", createdAt: now, updatedAt: now, turns: [] };
}

function shortTitle(text: string, max = 40): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max - 1) + "…";
}

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(ts).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

export default function AgentWorkbench({ storeId, storeName }: { storeId: string; storeName: string }) {
  const t = useT();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Load from localStorage once on mount, scoped per store. Separates one shop's conversations
  // from another so the thread list isn't contaminated when the user switches store.
  /* eslint-disable react-hooks/set-state-in-effect -- intentional: hydrate persisted state after mount; useSyncExternalStore would force the setters into a store adapter for a one-shot read. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(storeId));
      if (raw) {
        const parsed = JSON.parse(raw) as Thread[];
        setThreads(parsed);
        setActiveId(parsed[0]?.id ?? null);
      }
    } catch {
      // storage disabled; proceed with empty state
    }
    setHydrated(true);
  }, [storeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on every change — tiny payload, no debounce needed.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY(storeId), JSON.stringify(threads));
    } catch {
      /* quota or disabled; skip */
    }
  }, [threads, hydrated, storeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [activeId, sending, threads]);

  const active = useMemo(() => threads.find((th) => th.id === activeId) ?? null, [threads, activeId]);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (th) =>
        th.title.toLowerCase().includes(q) ||
        th.turns.some((turn) => turn.content.toLowerCase().includes(q))
    );
  }, [threads, query]);

  function startNewThread() {
    const t2 = newThread();
    setThreads((cur) => [t2, ...cur]);
    setActiveId(t2.id);
    setDraft("");
    setError("");
  }

  function deleteThread(id: string) {
    setThreads((cur) => {
      const next = cur.filter((th) => th.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;

    // If no active thread, create one on the fly so the first message always lands somewhere.
    let threadId = activeId;
    if (!threadId) {
      const fresh = newThread();
      threadId = fresh.id;
      setThreads((cur) => [fresh, ...cur]);
      setActiveId(fresh.id);
    }

    const userTurn: Turn = { id: nextId("u"), role: "user", content: question };
    const history = (active?.turns ?? []).map((turn) => ({ role: turn.role, content: turn.content }));
    // eslint-disable-next-line react-hooks/purity -- wall-clock time intentionally captured for the thread's updatedAt sort key.
    const stamp = Date.now();

    setThreads((cur) =>
      cur.map((th) =>
        th.id === threadId
          ? {
              ...th,
              title: th.turns.length === 0 ? shortTitle(question) : th.title,
              updatedAt: stamp,
              turns: [...th.turns, userTurn],
            }
          : th
      )
    );
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

      const reply: Turn = {
        id: nextId("a"),
        role: "assistant",
        content: data.reply || t("agent.noReply"),
        activity: Array.isArray(data.activity) ? data.activity : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        truncated: data.truncated === true,
      };
      // eslint-disable-next-line react-hooks/purity -- wall-clock time for the sort key, as above.
      const replyStamp = Date.now();
      setThreads((cur) =>
        cur.map((th) =>
          th.id === threadId ? { ...th, updatedAt: replyStamp, turns: [...th.turns, reply] } : th
        )
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("agent.genericError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid min-h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Thread sidebar — ChatGPT-style history rail */}
      <aside className="flex flex-col border-b border-neutral-200 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Conversaciones
          </p>
          <button
            type="button"
            onClick={startNewThread}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-2.5 py-1 text-xs font-semibold text-neutral-950 hover:bg-lime-400"
          >
            <MessageSquarePlus size={13} /> Nueva
          </button>
        </div>
        <div className="relative px-3">
          <Search size={13} className="absolute top-1/2 left-5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pr-2 pl-7 text-xs text-neutral-900 outline-none focus:border-neutral-300"
          />
        </div>

        <ul className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
          {!hydrated ? (
            <li className="px-2 py-6 text-center text-xs text-neutral-400">Cargando…</li>
          ) : filteredThreads.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-neutral-400">
              {query ? "Sin resultados." : "Aún no has empezado una conversación."}
            </li>
          ) : (
            filteredThreads.map((th) => {
              const isActive = th.id === activeId;
              return (
                <li key={th.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(th.id)}
                    className={`group mb-0.5 flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isActive ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{th.title}</p>
                      <p
                        className={`mt-0.5 text-[10px] ${
                          isActive ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        {formatRelative(th.updatedAt)} · {th.turns.length} mensajes
                      </p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Eliminar conversación"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("¿Eliminar esta conversación? No se puede deshacer.")) {
                          deleteThread(th.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          if (confirm("¿Eliminar esta conversación?")) deleteThread(th.id);
                        }
                      }}
                      className={`shrink-0 cursor-pointer rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isActive ? "text-neutral-300 hover:bg-neutral-800" : "text-neutral-400 hover:bg-neutral-200"
                      }`}
                    >
                      <Trash2 size={12} />
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <p className="border-t border-neutral-200 px-3 py-2 text-[10px] text-neutral-400">
          Guardado en este navegador.
        </p>
      </aside>

      {/* Chat column */}
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 px-5 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-lime-300">
            <Bot size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {active ? active.title : "EcomOS Operator"}
            </p>
            <p className="text-[11px] text-neutral-500">
              Analizando <strong className="font-medium text-neutral-700">{storeName}</strong> · solo lectura
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5" aria-live="polite">
          {!active || active.turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-neutral-950">
                <Bot size={22} />
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-900">
                  ¿Qué quieres saber hoy sobre {storeName}?
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  El Operator es solo lectura — hace preguntas por ti, no mueve dinero.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 px-3">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={sending}
                    onClick={() => void send(t(key))}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            active.turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-neutral-900 px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap text-white">
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
                              ? "border-neutral-200 bg-neutral-50 text-neutral-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          <Wrench size={11} />
                          {item.tool}
                          {item.detail ? ` · ${item.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-neutral-50 px-3.5 py-3">
                    <p className="text-sm leading-6 whitespace-pre-wrap text-neutral-900">{turn.content}</p>
                  </div>
                </div>
              )
            )
          )}

          {sending && (
            <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-500">
              {t("agent.thinking")}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <p
            role="alert"
            className="mx-5 mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-700"
          >
            <CircleAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              {error}
              {retryAfter !== null && ` ${t("agent.retryIn", { seconds: retryAfter })}`}
            </span>
          </p>
        )}

        <form
          className="flex items-end gap-2 border-t border-neutral-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
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
            placeholder={active ? "Escribe tu mensaje…" : "Empieza una nueva conversación…"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            className="min-h-[52px] flex-1 resize-y rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-neutral-900 outline-none focus:border-neutral-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} />
            {sending ? t("agent.sending") : t("agent.send")}
          </button>
        </form>
      </div>
    </section>
  );
}
