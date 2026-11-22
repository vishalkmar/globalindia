"use client";

/**
 * Last-resort error page when even the root layout fails (e.g. the database is down during render).
 * Self-contained: no theme, no data, no framework details.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en-IN">
      <body
        style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F6F4EF", color: "#16201F" }}
      >
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 20px" }}>
          <p style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5B6766" }}>
            Global India
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 32, color: "#0F3B3A" }}>
            The website is having a problem.
          </h1>
          <p style={{ lineHeight: 1.6 }}>
            Please try again in a minute. For urgent orders call +91 80717 79152.
          </p>
          {error?.digest ? (
            <p style={{ fontFamily: "monospace", fontSize: 13, color: "#5B6766" }}>
              Reference {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "10px 18px",
              background: "#0F3B3A",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
