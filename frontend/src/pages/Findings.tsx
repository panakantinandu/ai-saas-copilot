import { useEffect, useState } from "react";

// frontend — vite.config or .env
// const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const BASE_URL = import.meta.env.VITE_API_URL ?? "/_/backend";
interface Finding {
  repository: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  finding: string;
  risk: string;
  category: string;
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Critical: { bg: "#7f1d1d20", color: "#fca5a5", border: "#7f1d1d60" },
  High:     { bg: "#78350f20", color: "#fcd34d", border: "#78350f60" },
  Medium:   { bg: "#1e3a5f20", color: "#93c5fd", border: "#1e3a5f60" },
  Low:      { bg: "#14532d20", color: "#86efac", border: "#14532d60" },
};

const C = {
  bg:      "#0d0d10",
  surface: "#13131a",
  card:    "#1a1a24",
  border:  "#2a2a3a",
  text:    "#e2e2f0",
  muted:   "#6b6b8a",
  accent:  "#6366f1",
};

export default function Findings() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/security/findings`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data: Finding[]) => {
        setFindings(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const counts = {
    Critical: findings.filter(f => f.severity === "Critical").length,
    High:     findings.filter(f => f.severity === "High").length,
    Medium:   findings.filter(f => f.severity === "Medium").length,
    Low:      findings.filter(f => f.severity === "Low").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','Segoe UI',sans-serif", padding: "32px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Security Findings
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          Live data from <code style={{ background: C.card, padding: "1px 6px", borderRadius: 4 }}>GET /security/findings</code>
        </div>
      </div>

      {/* Summary pills */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          {(["Critical", "High", "Medium", "Low"] as const).map(sev => {
            const s = SEVERITY_STYLE[sev];
            return (
              <div key={sev} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{counts[sev]}</span>
                <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{sev}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: C.muted, fontSize: 14, padding: "40px 0", textAlign: "center" }}>
          Loading security findings...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "#7f1d1d20", border: "1px solid #7f1d1d60", borderRadius: 10, padding: "18px 22px", color: "#fca5a5", fontSize: 14 }}>
          <strong>Failed to load findings:</strong> {error}
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
            Make sure the backend is running at <code>{BASE_URL}</code> and the database is seeded.
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && findings.length === 0 && (
        <div style={{ color: C.muted, fontSize: 14, padding: "40px 0", textAlign: "center" }}>
          No security findings. All repositories look clean.
        </div>
      )}

      {/* Findings list */}
      {!loading && !error && findings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {findings.map((f, i) => {
            const s = SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.Low;
            return (
              <div
                key={i}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "18px 22px",
                  borderLeft: `3px solid ${s.color}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{f.repository}</span>
                    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 11, fontWeight: 700, borderRadius: 5, padding: "2px 8px" }}>
                      {f.severity}
                    </span>
                    <span style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, borderRadius: 5, padding: "2px 7px" }}>
                      {f.category}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{f.finding}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{f.risk}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
