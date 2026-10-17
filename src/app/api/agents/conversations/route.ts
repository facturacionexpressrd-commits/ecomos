import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function canReadStore(userId: string, storeId: string) {
  const grants = await loadStoreAccessGrants(userId);
  return hasCapability(grants, storeId, CAPABILITIES.storeRead);
}

/** Lista threads del usuario en una tienda o carga los mensajes de un thread concreto. */
export async function GET(req: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("storeId");
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!storeId) return NextResponse.json({ error: "Falta la tienda." }, { status: 400 });
  if (!(await canReadStore(user.id, storeId))) {
    return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });
  }

  if (conversationId) {
    const conversation = await prisma.agentConversation.findFirst({
      where: { id: conversationId, userId: user.id, storeId },
      include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
    if (!conversation) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          metadata: item.metadata,
          createdAt: item.createdAt,
        })),
      },
    });
  }

  const conversations = await prisma.agentConversation.findMany({
    where: { userId: user.id, storeId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({ conversations });
}

/** Crea un thread vacío y privado para el usuario y la tienda seleccionada. */
export async function POST(req: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }
  const { storeId } = (body ?? {}) as { storeId?: unknown };
  if (typeof storeId !== "string" || !storeId) {
    return NextResponse.json({ error: "Falta la tienda." }, { status: 400 });
  }
  if (!(await canReadStore(user.id, storeId))) {
    return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { organizationId: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });

  const conversation = await prisma.agentConversation.create({
    data: {
      organizationId: store.organizationId,
      storeId,
      userId: user.id,
      title: "Nueva conversación",
    },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ conversation }, { status: 201 });
}

/** Elimina solo un thread que pertenece al usuario y tienda actuales. */
export async function DELETE(req: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }
  const { storeId, conversationId } = (body ?? {}) as {
    storeId?: unknown;
    conversationId?: unknown;
  };
  if (typeof storeId !== "string" || !storeId || typeof conversationId !== "string" || !conversationId) {
    return NextResponse.json({ error: "Falta la tienda o la conversación." }, { status: 400 });
  }
  if (!(await canReadStore(user.id, storeId))) {
    return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });
  }

  const deleted = await prisma.agentConversation.deleteMany({
    where: { id: conversationId, userId: user.id, storeId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
