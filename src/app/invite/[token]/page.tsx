import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import AcceptInvitationButton from "./accept-button";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true, role: true },
  });

  if (!invitation) {
    return <Message title="Invitation not found">This link is invalid.</Message>;
  }
  if (invitation.status !== "pending") {
    return <Message title="Invitation already used">This invitation has already been accepted or revoked.</Message>;
  }
  if (invitation.expiresAt < new Date()) {
    return <Message title="Invitation expired">Ask whoever invited you to send a new one.</Message>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailMatches = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Join {invitation.organization.name}</h1>
      <p className="text-sm text-gray-600">
        Invited as <strong>{invitation.role.name}</strong> to {invitation.email}.
      </p>
      {!user ? (
        <p className="text-sm">
          Sign in or create an account with <strong>{invitation.email}</strong> first, then come back to this link.{" "}
          <a href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="underline">
            Go to login
          </a>
        </p>
      ) : !emailMatches ? (
        <p className="text-sm text-red-600">
          You are signed in as {user.email}, but this invitation was sent to {invitation.email}.
        </p>
      ) : (
        <AcceptInvitationButton token={token} />
      )}
    </main>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-gray-600">{children}</p>
    </main>
  );
}
