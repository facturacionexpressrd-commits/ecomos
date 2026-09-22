"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteForm({ storeId, roles }: { storeId: string; roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => r.name !== "Owner")?.id ?? roles[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roleId, storeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send invitation");
      setNotice(data.emailSent ? `Invitation emailed to ${email}.` : `Invitation created, but the email didn't send — share this link: ${data.acceptUrl}`);
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-xs text-faint">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="rounded-lg border border-line-hi bg-white/5 px-3 py-2 text-sm text-hi placeholder:text-faint focus:border-gold/50 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-faint">
        Role
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="rounded-lg border border-line-hi bg-white/5 px-3 py-2 text-sm text-hi focus:border-gold/50 focus:outline-none"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id} className="bg-panel text-hi">
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={loading || !roleId}
        className="shrink-0 rounded-lg bg-gradient-to-b from-gold-hi to-gold px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send invite"}
      </button>
      {error && <p className="text-xs text-coral sm:basis-full">{error}</p>}
      {notice && <p className="text-xs text-teal sm:basis-full">{notice}</p>}
    </form>
  );
}
