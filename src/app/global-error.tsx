"use client";

// Last resort when the root layout itself fails; it replaces <html>, so it can't rely on app styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 20 }}>EcomOS is having trouble</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
