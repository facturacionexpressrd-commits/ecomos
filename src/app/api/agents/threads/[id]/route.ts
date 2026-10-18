import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

type Ctx = { params: Promise<{ id: string }> };

/** Load a single thread with its messages (checked by both ownership and store access). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const thread = await prisma.agentThread.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread || thread.userId !== user.id) {
    return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, thread.storeId, CAPABILITIES.storeRead)) {
    return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messages: thread.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        activity: m.activityJson ?? null,
        sources: m.sourcesJson ?? null,
        truncated: m.truncated,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}

/** Delete a thread (cascades to its messages). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const thread = await prisma.agentThread.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!thread || thread.userId !== user.id) {
    return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  await prisma.agentThread.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
