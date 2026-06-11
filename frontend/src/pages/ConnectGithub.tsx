const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
export default function ConnectGithub() {
  const C = {
    bg: "#0a0f1e", surface: "#0f172a", card: "#131c2e",
    border: "#1e2d45", text: "#e2e8f0", muted: "#64748b",
    accent: "#6366f1", green: "#22c55e", yellow: "#f59e0b", red: "#ef4444",
  };

  const handleConnect = () => {
    window.location.href = `${API_URL}/auth/github/login`;
  };

  const features = [
    { icon: "⚠", title: "Risk Scoring", desc: "Every repo scored 0–100 based on inactivity, public exposure, and security posture" },
    { icon: "✦", title: "AI Recommendations", desc: "AI analyzes each dormant repo and tells you exactly what to do — archive, review, or reassign" },
    { icon: "$", title: "Cost Waste Detection", desc: "Calculates monthly CI/CD waste from dormant repos. Shows the dollar figure eating your budget" },
    { icon: "⬡", title: "Secret Exposure Detection", desc: "Flags public repos inactive 180+ days — the #1 source of leaked API keys and credentials" },
  ];

  const stats = [
    { value: "12.8M", label: "secrets leaked on GitHub in 2023" },
    { value: "23K", label: "repos hit by one compromised Action in 2025" },
    { value: "$4,500", label: "avg monthly waste per 20-repo org" },
    { value: "18/20", label: "of your repos are likely dormant right now" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .feat:hover { border-color: #2a3f5f !important; }
        .cta:hover { background: #818cf8 !important; transform: scale(1.02); }
        .cta { transition: all 0.2s ease !important; }
      `}</style>

      {/* Nav */}
      <div style={{ padding: "20px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SaaS Ops Copilot</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 12, color: C.muted }}>AI-Powered</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px 48px", textAlign: "center", animation: "fadeUp 0.5s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#6366f115", border: "1px solid #6366f130", borderRadius: 99, padding: "5px 14px", marginBottom: 28, fontSize: 12, color: "#a78bfa" }}>
          ✦ AI Agent · Security · DevOps Intelligence
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.15, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
          Your GitHub repos are{" "}
          <span style={{ color: C.red }}>leaking money</span>{" "}
          and{" "}
          <span style={{ color: C.yellow }}>exposing secrets</span>
        </h1>
        <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: "0 auto 36px" }}>
          Connect GitHub in one click. In 30 seconds, see exactly which repos are dormant, how much they're costing you, and which ones are security risks — with AI-generated action plans for each.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="cta" onClick={handleConnect} style={{ background: C.accent, color: "white", border: "none", borderRadius: 10, padding: "14px 28px", cursor: "pointer", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            Connect GitHub - it's free
          </button>
          <button onClick={() => window.location.href = "/?demo=true"} style={{ background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 24px", cursor: "pointer", fontSize: 15, fontWeight: 500 }}>
            Try Demo →
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 14 }}>Read-only access · No code changes · Works with orgs & personal repos</p>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 820, margin: "0 auto 60px", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: i === 0 ? C.red : i === 1 ? C.yellow : i === 2 ? "#a78bfa" : C.accent, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 820, margin: "0 auto 80px", padding: "0 32px" }}>
        <p style={{ textAlign: "center", fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24 }}>What you get in 30 seconds</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {features.map((f, i) => (
            <div key={i} className="feat" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", transition: "border-color 0.2s", display: "flex", gap: 14 }}>
              <div style={{ width: 36, height: 36, background: "#6366f115", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", borderTop: `1px solid ${C.border}`, padding: "48px 32px" }}>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Takes 30 seconds. No installation required.</p>
        <button className="cta" onClick={handleConnect} style={{ background: C.accent, color: "white", border: "none", borderRadius: 10, padding: "13px 28px", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
          Connect GitHub now →
        </button>
      </div>
    </div>
  );
}
