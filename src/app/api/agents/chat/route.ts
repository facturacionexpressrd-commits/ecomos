import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { agentChatQuotaExceeded, AGENT_CHAT_AUDIT_ACTION } from "@/lib/limits";
import { reportError } from "@/lib/alerts";
import { toolsForGrants } from "@/lib/agents/tools";
import { getLocale } from "@/lib/i18n/server";
import {
  AGENT_LIMITS,
  AnthropicUnavailableError,
  runAgentTurn,
  sanitizeHistory,
} from "@/lib/agents/loop";

/**
 * Chat del agente EcomOS Operator. Autentica con Supabase, verifica el acceso del usuario a la
 * tienda pedida y solo entonces deja que Claude use herramientas de lectura acotadas a esa tienda.
 * El `storeId` del navegador nunca se confía: se valida contra las concesiones del usuario.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  const { storeId, message, history, threadId } = (body ?? {}) as {
    storeId?: unknown;
    message?: unknown;
    history?: unknown;
    threadId?: unknown;
  };

  if (typeof storeId !== "string" || !storeId) {
    return NextResponse.json({ error: "Falta la tienda." }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
  }
  if (message.length > AGENT_LIMITS.maxMessageChars) {
    return NextResponse.json(
      { error: `El mensaje no puede pasar de ${AGENT_LIMITS.maxMessageChars} caracteres.` },
      { status: 400 }
    );
  }

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });
  }

  // Optional thread persistence. Caller passes the thread id after creating it via POST
  // /api/agents/threads; we check ownership here so a crafted body can't scribble into
  // someone else's history.
  let threadOwned: { id: string; title: string } | null = null;
  if (typeof threadId === "string" && threadId) {
    const existing = await prisma.agentThread.findUnique({
      where: { id: threadId },
      select: { id: true, userId: true, storeId: true, title: true },
    });
    if (!existing || existing.userId !== user.id || existing.storeId !== storeId) {
      return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
    }
    threadOwned = { id: existing.id, title: existing.title };
  }

  const limited = await agentChatQuotaExceeded(storeId);
  if (limited) {
    return NextResponse.json(
      { error: "Alcanzaste el límite de consultas al agente. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "El agente no está configurado en este entorno (falta ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { name: true, organizationId: true },
  });
  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
  }

  // Solo las herramientas que las capacidades de este usuario permiten en esta tienda.
  const tools = toolsForGrants(grants, storeId);

  try {
    const result = await runAgentTurn({
      apiKey,
      ctx: { storeId, grants },
      storeName: store.name,
      tools,
      history: sanitizeHistory(history),
      message: message.trim(),
      // El agente responde en el idioma que el usuario tiene activo en la interfaz.
      locale: await getLocale(),
    });

    // Una fila por turno: deja rastro de uso y es el contador de la cuota. Sin prompts,
    // sin respuesta del modelo y sin datos de la tienda.
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: AGENT_CHAT_AUDIT_ACTION,
        metadata: {
          tools: result.activity.map((item) => item.tool),
          rounds: result.roundsUsed,
          messageChars: message.trim().length,
        },
      },
    });

    // Persist the exchange if a thread was passed. First user message in a thread becomes
    // the title (truncated); updatedAt auto-bumps and surfaces the thread to the top of the
    // sidebar on the client's next fetch.
    if (threadOwned) {
      const trimmed = message.trim();
      const titleFromFirst =
        threadOwned.title === "Nueva conversación"
          ? (trimmed.length > 60 ? trimmed.slice(0, 59) + "…" : trimmed)
          : threadOwned.title;
      await prisma.$transaction([
        prisma.agentMessage.create({
          data: { threadId: threadOwned.id, role: "user", content: trimmed },
        }),
        prisma.agentMessage.create({
          data: {
            threadId: threadOwned.id,
            role: "assistant",
            content: result.reply,
            activityJson: result.activity as unknown as object,
            sourcesJson: result.sources as unknown as object,
            truncated: result.truncated,
          },
        }),
        prisma.agentThread.update({
          where: { id: threadOwned.id },
          data: { title: titleFromFirst },
        }),
      ]);
    }

    return NextResponse.json({
      reply: result.reply,
      activity: result.activity,
      sources: result.sources,
      truncated: result.truncated,
      readOnly: true,
      threadId: threadOwned?.id ?? null,
    });
  } catch (error) {
    if (error instanceof AnthropicUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Reporte saneado: nunca el prompt, la respuesta ni los datos de la tienda.
    await reportError(error, { where: "Agent chat", storeId });
    return NextResponse.json(
      { error: "El agente no pudo completar la consulta." },
      { status: 500 }
    );
  }
}
