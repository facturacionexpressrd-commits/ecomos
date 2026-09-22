"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DangerZone({ workspaceName }: { workspaceName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspace/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete workspace");
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-coral/30 bg-coral/5 p-6">
      <p className="text-sm font-medium text-coral">Danger zone</p>
      <p className="mt-1 text-sm text-lo">
        Permanently delete this workspace: every store, product, order, campaign, teammate and audit
        log. This cannot be undone. Your own login stays intact — you can create a new workspace
        afterward.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-coral/40 px-4 py-2 text-sm font-medium text-coral hover:bg-coral/10"
        >
          Delete workspace
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-lo">
            Type <strong className="text-hi">{workspaceName}</strong> to confirm
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoFocus
              className="rounded-lg border border-coral/40 bg-white/5 px-3 py-2 text-sm text-hi focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || confirmName !== workspaceName}
              className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
            >
              {loading ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmName("");
                setError("");
              }}
              className="rounded-lg border border-line-hi px-4 py-2 text-sm text-lo hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-coral">{error}</p>}
        </form>
      )}
    </div>
  );
}
