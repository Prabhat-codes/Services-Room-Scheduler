"use client";

/** Last-resort fallback: replaces the whole document, so it carries its own styles. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f3f5f2",
          color: "#17211c",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Room Checker hit a problem</h1>
          <p style={{ fontSize: "16px", lineHeight: 1.45, margin: "0 0 20px" }}>
            Nothing you ticked is lost. Reload to carry on{error.digest ? `, and tell the admin code ${error.digest}` : ""}.
          </p>
          <button
            onClick={reset}
            style={{ background: "#2448c9", color: "#fff", border: 0, borderRadius: "12px", padding: "14px 22px", fontSize: "17px", fontWeight: 700 }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
