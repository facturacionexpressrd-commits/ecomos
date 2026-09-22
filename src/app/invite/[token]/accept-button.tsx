"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvitationButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function accept() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={accept}
        disabled={loading}
        className="rounded bg-gold px-3 py-2 text-ink disabled:opacity-50"
      >
        {loading ? "Joining…" : "Accept invitation"}
      </button>
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  );
}
