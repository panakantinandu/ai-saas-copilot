import { useEffect, useState, useRef } from "react";

// const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "/_/backend";
const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
// ─── Types ────────────────────────────────────────────────────────────────────
interface Summary {
  total_repositories: number;
  dormant_repositories: number;
  active_repositories: number;
  critical_repositories: number;
  public_repositories: number;
  estimated_monthly_waste: number;
}
interface DormantRepo { repository: string; author: string; days_inactive: number; }
interface Rec {
  repository: string;
  recommendation: string;
  business_impact: string;
  security_risk: string;
  suggested_action: string;
  estimated_monthly_waste?: number;
}
interface Health { repository: string; status: string; days_inactive: number; author: string; }
interface Finding { repository: string; severity: string; finding: string; risk: string; category: string; }
interface RiskScore { repository: string; risk_score: number; days_inactive: number; is_public: boolean; author: string; }
interface CostWaste { repositories: any[]; total_monthly_waste_usd: number; total_annual_waste_usd: number; repo_count: number; }
interface ChatMessage { role: "user" | "assistant"; content: string; }

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#070c18",
  surface: "#0b1120",
  card: "#0f1929",
  border: "#172335",
  borderHover: "#253d5a",
  text: "#e2e8f0",
  muted: "#5a7090",
  dim: "#1a2f48",
  accent: "#6366f1",
  accentHover: "#818cf8",
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  purple: "#a78bfa",
  teal: "#2dd4bf",
  orange: "#fb923c",
  cyan: "#06b6d4",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pill = (color: string, bg: string, _text: string) => ({
  display: "inline-flex" as const, alignItems: "center" as const,
  background: bg, color,
  padding: "2px 8px", borderRadius: 99, fontSize: 10,
  fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" as const,
});

const statusPill = (s: string) => {
  if (s === "Critical") return pill(C.red, "#ef444420", s);
  if (s === "High") return pill(C.orange, "#fb923c20", s);
  if (s === "Medium") return pill(C.yellow, "#f59e0b20", s);
  if (s === "Warning") return pill(C.yellow, "#f59e0b20", s);
  if (s === "Healthy") return pill(C.green, "#22c55e20", s);
  return pill(C.purple, "#a78bfa20", s);
};

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? C.red : score >= 40 ? C.yellow : C.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 26, textAlign: "right" }}>{score}</span>
    </div>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <div style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${C.border}`, borderTopColor: C.accent,
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────────
function ActionModal({ repo, action, onClose }: { repo: Rec | null; action: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<any>(null);
  if (!repo) return null;

  const MOCK_RESULTS: Record<string, any> = {
    jira: {
      title: "Jira Ticket Created", icon: "🎫", color: C.teal,
      fields: [
        { label: "Ticket ID", value: `OPS-${Math.floor(Math.random() * 9000) + 1000}` },
        { label: "Project", value: "OPS — SaaS Operations" },
        { label: "Summary", value: `Archive dormant repo: ${repo.repository}` },
        { label: "Priority", value: repo.security_risk.startsWith("CRITICAL") ? "🔴 Critical" : "🟡 High" },
        { label: "Assignee", value: "Platform Engineering" },
        { label: "Due Date", value: new Date(Date.now() + 14 * 864e5).toLocaleDateString() },
      ],
    },
    email: {
      title: "Email Sent", icon: "📧", color: C.cyan,
      fields: [
        { label: "To", value: "team-leads@company.com, security@company.com" },
        { label: "Subject", value: `[Action Required] Archive: ${repo.repository}` },
        { label: "Delivered to", value: "3 recipients" },
        { label: "Preview", value: repo.recommendation },
      ],
    },
    slack: {
      title: "Slack Notified", icon: "💬", color: C.purple,
      fields: [
        { label: "Channel", value: "#ops-alerts" },
        { label: "Pinged", value: "@platform-eng, @security-team" },
        { label: "Message", value: `🚨 *${repo.repository}* flagged — ${repo.recommendation}` },
      ],
    },
    archive: {
      title: "Repository Archived", icon: "📦", color: C.green,
      fields: [
        { label: "Repository", value: repo.repository },
        { label: "Status", value: "✓ Archived — now read-only" },
        { label: "Archived at", value: new Date().toLocaleString() },
        { label: "Monthly savings", value: `$${repo.estimated_monthly_waste ?? 375}/month recovered` },
      ],
    },
  };

  const META: Record<string, { label: string; color: string; icon: string }> = {
    jira:    { label: "Create Jira Ticket",  color: C.teal,   icon: "🎫" },
    email:   { label: "Generate Email",      color: C.cyan,   icon: "📧" },
    slack:   { label: "Notify Slack",        color: C.purple, icon: "💬" },
    archive: { label: "Archive Repository",  color: C.green,  icon: "📦" },
  };
  const meta = META[action];

  const handleRun = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setResult(MOCK_RESULTS[action]);
    setLoading(false);
    setDone(true);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000000a0", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: 500, maxWidth: "100%", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{meta.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>for {repo.repository}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          {!done ? (
            <>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📁 {repo.repository}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{repo.recommendation}</div>
              </div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                This action is <span style={{ color: C.yellow }}>simulated</span> — no real API calls will be made to GitHub, Jira, or Slack in this demo.
              </p>
              <button
                onClick={handleRun}
                disabled={loading}
                style={{ width: "100%", background: meta.color, color: "white", border: "none", borderRadius: 10, padding: "11px 0", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {loading ? <><Spinner /> Processing…</> : <>{meta.icon} {meta.label}</>}
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{result.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: result.color }}>{result.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Simulated successfully</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {result.fields.map((f: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "8px 12px", background: C.card, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, minWidth: 100 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, flex: 1 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={onClose} style={{ width: "100%", background: result.color, color: "white", border: "none", borderRadius: 10, padding: "11px 0", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                ✓ Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const isDemo = new URLSearchParams(window.location.search).get("demo") === "true";

  const [dataLoading, setDataLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [_dormantRepos, setDormantRepos] = useState<DormantRepo[]>([]);
  const [recommendations, setRecommendations] = useState<Rec[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [costWaste, setCostWaste] = useState<CostWaste | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your SaaS Ops Copilot. Ask me about risks, costs, or top actions to take — try 'which repo is most at risk?' or 'how much am I wasting?'" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [archivedRepos, setArchivedRepos] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [modalRepo, setModalRepo] = useState<Rec | null>(null);
  const [modalAction, setModalAction] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // ─── Load real data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) { setDataLoading(false); return; }

    async function loadRealData() {
      // Read token fresh — it was written to sessionStorage after OAuth completed
      const liveToken = sessionStorage.getItem("gh_token") ?? "";

      if (!liveToken) {
        console.warn("No gh_token in sessionStorage — cannot load real data");
        setDataLoading(false);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        "X-Auth-Token": liveToken,
      };

      try {
        // 1. Sync GitHub repos into DB
        setSyncStatus("syncing");
        const syncRes = await fetch(`${BASE_URL}/auth/github/sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        });
        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.detail ?? `Sync failed: ${syncRes.status}`);
        }
        setSyncStatus("done");

        // 2. Fetch all dashboard data in parallel
        const [summaryRes, dormantRes, riskRes, costRes, findingsRes] = await Promise.all([
          fetch(`${BASE_URL}/analytics/repository-summary`, { headers }),
          fetch(`${BASE_URL}/analytics/dormant-repositories`, { headers }),
          fetch(`${BASE_URL}/analytics/risk-scores`, { headers }),
          fetch(`${BASE_URL}/analytics/cost-waste`, { headers }),
          fetch(`${BASE_URL}/security/findings`, { headers }),
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (dormantRes.ok) setDormantRepos(await dormantRes.json());
        if (costRes.ok) setCostWaste(await costRes.json());
        if (findingsRes.ok) setFindings(await findingsRes.json());

        if (riskRes.ok) {
          const risks: RiskScore[] = await riskRes.json();
          setRiskScores(risks);
          setHealth(risks.map(r => ({
            repository: r.repository,
            status: r.risk_score >= 70 ? "Critical" : r.risk_score >= 40 ? "Warning" : "Healthy",
            days_inactive: r.days_inactive,
            author: r.author,
          })));
        }

        // 3. AI recommendations (optional — may be empty if /ai/generate not called yet)
        const recsRes = await fetch(`${BASE_URL}/ai/recommendations`, { headers });
        if (recsRes.ok) {
          const recs = await recsRes.json();
          if (recs.length > 0) setRecommendations(recs);
        }

      } catch (err: any) {
        console.error("Failed to load real data:", err);
        setSyncStatus("error");
        showToast(`⚠ ${err.message ?? "Failed to load data"}`);
      } finally {
        setDataLoading(false);
      }
    }

    loadRealData();
  }, [isDemo]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const openAction = (repo: Rec, action: string) => {
    setModalRepo(repo);
    setModalAction(action);
  };

  const handleArchive = (repo: Rec) => {
    openAction(repo, "archive");
    setTimeout(() => setArchivedRepos(prev => new Set([...prev, repo.repository])), 1500);
  };

  // Manual sync button
  const handleManualSync = async () => {
    const liveToken = sessionStorage.getItem("gh_token") ?? "";
    if (!liveToken) { showToast("⚠ Not authenticated"); return; }
    setSyncStatus("syncing");
    showToast("↻ Syncing your GitHub repos…");
    try {
      const res = await fetch(`${BASE_URL}/auth/github/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": liveToken },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus("done");
        showToast(`✓ Synced — ${data.repositories_found ?? "?"} repos found`);
      } else {
        throw new Error(`${res.status}`);
      }
    } catch (e: any) {
      setSyncStatus("error");
      showToast(`⚠ Sync failed: ${e.message}`);
    }
  };

  // ─── Chat ────────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(m => [...m, { role: "user", content: userMsg }]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const lower = userMsg.toLowerCase();

    const topRisk = [...riskScores].sort((a, b) => b.risk_score - a.risk_score)[0];
    const monthlyWaste = costWaste?.total_monthly_waste_usd ?? 0;
    const annualWaste = costWaste?.total_annual_waste_usd ?? 0;
    const dormantCount = costWaste?.repo_count ?? 0;
    const criticals = findings.filter(f => f.severity === "Critical");
    const top3 = [...riskScores].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3);

    let response = "";
    if (lower.includes("risk") || lower.includes("dangerous") || lower.includes("worst")) {
      response = topRisk
        ? `Highest-risk repo: **${topRisk.repository}** (score ${topRisk.risk_score}/100, ${topRisk.days_inactive} days inactive, ${topRisk.is_public ? "public" : "private"}). Archive it immediately.`
        : "No risk data yet — try syncing first.";
    } else if (lower.includes("money") || lower.includes("cost") || lower.includes("waste")) {
      response = monthlyWaste
        ? `You're wasting **$${monthlyWaste.toLocaleString()}/month** ($${annualWaste.toLocaleString()}/year) across ${dormantCount} dormant repos.`
        : "No cost data yet.";
    } else if (lower.includes("security") || lower.includes("vuln")) {
      response = criticals.length
        ? `**${criticals.length} critical finding(s)**. Worst: "${criticals[0].finding}" in \`${criticals[0].repository}\`.`
        : "No critical security findings.";
    } else if (lower.includes("top") || lower.includes("action") || lower.includes("fix")) {
      response = top3.length
        ? `Top 3 to act on:\n${top3.map((r, i) => `${i + 1}. **${r.repository}** — score ${r.risk_score}, ${r.days_inactive}d inactive`).join("\n")}`
        : "No repository data yet.";
    } else if (lower.includes("repo") || lower.includes("list")) {
      response = summary
        ? `**${summary.total_repositories} repos** total — ${summary.active_repositories} active, ${summary.dormant_repositories} dormant, ${summary.critical_repositories} critical.`
        : "No data yet.";
    } else {
      response = topRisk
        ? `Biggest concern right now: **${topRisk.repository}** (risk ${topRisk.risk_score}/100). Wasting ~$${monthlyWaste.toLocaleString()}/month on ${dormantCount} dormant repos. Ask me about risks, costs, security, or top 3 actions.`
        : "Still loading your data — try again in a moment, or click Sync GitHub.";
    }

    setChatMessages(m => [...m, { role: "assistant", content: response }]);
    setChatLoading(false);
  };

  // ─── Derived values ───────────────────────────────────────────────────────────
  const criticalFindings = findings.filter(f => f.severity === "Critical" || f.severity === "High");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "risk", label: "Risk Scores" },
    { id: "security", label: "Security" },
    { id: "ai", label: "AI Insights" },
    { id: "cost", label: "Cost Waste" },
    { id: "health", label: "Repo Health" },
  ];

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (dataLoading && !isDemo) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Inter', sans-serif" }}>
        <Spinner size={32} />
        <div style={{ color: C.muted, fontSize: 14 }}>
          {syncStatus === "syncing" ? "Syncing your GitHub repos…" : "Connecting to backend…"}
        </div>
        {syncStatus === "error" && (
          <div style={{ color: C.red, fontSize: 12, maxWidth: 320, textAlign: "center" }}>
            Failed to sync. Check your Render backend is running and GITHUB_CLIENT_ID / SECRET are set.
          </div>
        )}
      </div>
    );
  }

  // ─── Fallback values for when real data hasn't loaded yet ────────────────────
  const displaySummary = summary ?? {
    total_repositories: riskScores.length,
    dormant_repositories: riskScores.filter(r => r.days_inactive > 30).length,
    active_repositories: riskScores.filter(r => r.days_inactive <= 30).length,
    critical_repositories: riskScores.filter(r => r.days_inactive > 90).length,
    public_repositories: riskScores.filter(r => r.is_public).length,
    estimated_monthly_waste: costWaste?.total_monthly_waste_usd ?? 0,
  };

  const displayCostWaste = costWaste ?? {
    total_monthly_waste_usd: 0,
    total_annual_waste_usd: 0,
    repo_count: 0,
    repositories: [],
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes glow { 0%,100%{box-shadow:0 0 10px #6366f130} 50%{box-shadow:0 0 22px #6366f155} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 2px; }
        .tab-btn:hover { background: ${C.border} !important; }
        .row-hover:hover { background: ${C.dim} !important; }
        .act-btn { transition: all 0.15s ease !important; }
        .act-btn:hover { transform: translateY(-1px); opacity: 0.9; }
        .card-h:hover { border-color: ${C.borderHover} !important; }
      `}</style>

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, animation: "glow 3s infinite" }}>✦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>SaaS Ops Copilot</div>
            <div style={{ fontSize: 10, color: C.muted }}>AI-Powered Repository Intelligence</div>
          </div>
          <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 5, background: isDemo ? "#f59e0b10" : "#22c55e10", border: `1px solid ${isDemo ? "#f59e0b30" : "#22c55e30"}`, borderRadius: 6, padding: "3px 9px" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: isDemo ? C.yellow : C.green, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: isDemo ? C.yellow : C.green, fontWeight: 600 }}>
              {isDemo ? "Demo Mode" : `Live — ${displaySummary.total_repositories} repos`}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={() => setChatOpen(o => !o)} className="act-btn" style={{ background: chatOpen ? C.accent : C.card, color: chatOpen ? "white" : C.text, border: `1px solid ${chatOpen ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
            ✦ AI Copilot {chatOpen ? "▲" : "▼"}
          </button>
          <button onClick={handleManualSync} disabled={syncStatus === "syncing"} className="act-btn" style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5, opacity: syncStatus === "syncing" ? 0.6 : 1 }}>
            {syncStatus === "syncing" ? <><Spinner size={12} /> Syncing…</> : "⟳ Sync GitHub"}
          </button>
          <button onClick={async () => {
            const liveToken = sessionStorage.getItem("gh_token") ?? "";
            if (!liveToken) { showToast("⚠ Not authenticated"); return; }
            showToast("↻ Generating AI insights — this may take 30s…");
            try {
              const res = await fetch(`${BASE_URL}/ai/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Auth-Token": liveToken },
              });
              if (res.ok) {
                const d = await res.json();
                showToast(`✓ AI insights generated for ${d.generated ?? "?"} repos`);
                // Refresh recommendations
                const recsRes = await fetch(`${BASE_URL}/ai/recommendations`, { headers: { "X-Auth-Token": liveToken } });
                if (recsRes.ok) setRecommendations(await recsRes.json());
              } else {
                throw new Error(`${res.status}`);
              }
            } catch (e: any) {
              showToast(`⚠ AI generation failed: ${e.message}`);
            }
          }} className="act-btn" style={{ background: C.accent, color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            ✦ Generate AI Insights
          </button>
        </div>
      </div>

      {/* ── AI Chat Drawer ───────────────────────────────────────────────── */}
      {chatOpen && (
        <div style={{ position: "fixed", right: 0, top: 60, bottom: 0, width: 380, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 40, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>✦ AI Copilot Chat</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Ask anything about your repositories</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "86%", padding: "9px 13px", borderRadius: msg.role === "user" ? "13px 13px 3px 13px" : "13px 13px 13px 3px", background: msg.role === "user" ? C.accent : C.card, border: msg.role === "assistant" ? `1px solid ${C.border}` : "none", fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-line" }}>
                  {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", gap: 4, padding: "9px 13px", background: C.card, borderRadius: "13px 13px 13px 3px", width: "fit-content", border: `1px solid ${C.border}` }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.muted, animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Ask about risks, costs, actions…"
              style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 11px", color: C.text, fontSize: 12, outline: "none" }}
            />
            <button onClick={sendChat} disabled={chatLoading} style={{ background: C.accent, color: "white", border: "none", borderRadius: 7, padding: "7px 13px", cursor: "pointer", fontWeight: 600 }}>↑</button>
          </div>
          <div style={{ padding: "6px 14px 12px", display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["Which repo is riskiest?", "How much am I wasting?", "Top 3 actions?"].map(q => (
              <button key={q} onClick={() => setChatInput(q)} style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 99, padding: "3px 9px", cursor: "pointer", fontSize: 10 }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 20px", fontSize: 12, fontWeight: 500, zIndex: 100, animation: "fadeIn 0.2s ease", color: toast.startsWith("✓") ? C.green : toast.startsWith("↻") ? C.accent : C.red, boxShadow: "0 8px 24px #00000060" }}>
          {toast}
        </div>
      )}

      {/* ── Action Modal ──────────────────────────────────────────────────── */}
      {modalRepo && (
        <ActionModal repo={modalRepo} action={modalAction} onClose={() => { setModalRepo(null); setModalAction(""); }} />
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 28px", marginRight: chatOpen ? 380 : 0, transition: "margin-right 0.25s ease" }}>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 22 }}>
          {[
            { label: "Total Repos",    value: displaySummary.total_repositories,          color: C.accent,  sub: "monitored" },
            { label: "Active",         value: displaySummary.active_repositories,          color: C.green,   sub: "< 30d" },
            { label: "Dormant",        value: displaySummary.dormant_repositories,         color: C.yellow,  sub: "> 30d" },
            { label: "Critical",       value: displaySummary.critical_repositories,        color: C.red,     sub: "> 90d" },
            { label: "Public",         value: displaySummary.public_repositories,          color: C.orange,  sub: "exposed" },
            { label: "Monthly Waste",  value: `$${displaySummary.estimated_monthly_waste.toLocaleString()}`, color: C.purple, sub: "CI/CD waste" },
          ].map(card => (
            <div key={card.label} className="card-h" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "14px 16px", transition: "border-color 0.2s" }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 5 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Alert Bar */}
        {criticalFindings.length > 0 && (
          <div style={{ background: "#ef444410", border: `1px solid #ef444430`, borderRadius: 9, padding: "11px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, animation: "pulse 1.5s infinite", flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: C.red }}>{criticalFindings.length} Critical/High Security Finding{criticalFindings.length > 1 ? "s" : ""} Detected</span>
              <span style={{ color: C.muted, marginLeft: 8 }}>Public abandoned repos are being actively scanned for exposed secrets</span>
            </div>
            <button onClick={() => setActiveTab("security")} className="act-btn" style={{ background: C.red, color: "white", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>View Now</button>
          </div>
        )}

        {/* Empty state — real data loaded but 0 repos */}
        {!isDemo && !dataLoading && riskScores.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>No repositories found</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Click "Sync GitHub" to import your repos, or check that your GitHub token has the correct scopes (read:user, read:org).</div>
            <button onClick={handleManualSync} className="act-btn" style={{ background: C.accent, color: "white", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              ⟳ Sync GitHub Now
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: C.card, padding: 3, borderRadius: 9, marginBottom: 20, width: "fit-content", border: `1px solid ${C.border}` }}>
          {tabs.map(t => (
            <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 12, background: activeTab === t.id ? C.accent : "transparent", color: activeTab === t.id ? "white" : C.muted, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 13 }}>Top Risk Repositories</div>
              {riskScores.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "20px 0" }}>No data — sync GitHub to load your repos</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {riskScores.slice(0, 8).map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 10, alignItems: "center", opacity: archivedRepos.has(r.repository) ? 0.4 : 1 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                          {r.repository}
                          {r.is_public && <span style={{ fontSize: 9, background: "#fb923c18", color: C.orange, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>PUBLIC</span>}
                          {archivedRepos.has(r.repository) && <span style={{ fontSize: 9, background: "#22c55e18", color: C.green, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ARCHIVED</span>}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted }}>{r.days_inactive}d inactive · {r.author}</div>
                      </div>
                      <RiskBar score={r.risk_score} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Security Findings</div>
                {[
                  { label: "Critical", items: findings.filter(f => f.severity === "Critical"), barBg: "#ef444418", text: C.red },
                  { label: "High",     items: findings.filter(f => f.severity === "High"),     barBg: "#fb923c18", text: C.orange },
                  { label: "Medium",   items: findings.filter(f => f.severity === "Medium"),   barBg: "#f59e0b18", text: C.yellow },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 11px", background: row.barBg, borderRadius: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: row.text, fontWeight: 500 }}>{row.label} Severity</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: row.text }}>{row.items.length}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Cost Waste</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Monthly waste</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: C.purple }}>${displayCostWaste.total_monthly_waste_usd.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Annual waste</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.red }}>${displayCostWaste.total_annual_waste_usd.toLocaleString()}</span>
                </div>
                <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
                <div style={{ fontSize: 11, color: C.muted }}>{displayCostWaste.repo_count} dormant repos consuming budget</div>
              </div>
            </div>
          </div>
        )}

        {/* ── RISK SCORES ──────────────────────────────────────────────── */}
        {activeTab === "risk" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, overflow: "hidden" }}>
            {riskScores.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 12, color: C.muted }}>No risk data — sync GitHub first</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Repository", "Risk Score", "Days Inactive", "Visibility", "Last Author"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskScores.map((r, i) => (
                    <tr key={i} className="row-hover" style={{ borderTop: `1px solid ${C.border}`, transition: "background 0.1s", opacity: archivedRepos.has(r.repository) ? 0.4 : 1 }}>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 500 }}>
                        {r.repository}
                        {archivedRepos.has(r.repository) && <span style={{ marginLeft: 6, fontSize: 9, color: C.green, background: "#22c55e18", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ARCHIVED</span>}
                      </td>
                      <td style={{ padding: "11px 14px", width: 160 }}><RiskBar score={r.risk_score} /></td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: r.days_inactive > 180 ? C.red : C.yellow }}>{r.days_inactive}d</td>
                      <td style={{ padding: "11px 14px" }}><span style={pill(r.is_public ? C.orange : C.muted, r.is_public ? "#fb923c18" : C.border, "")}>{r.is_public ? "Public" : "Private"}</span></td>
                      <td style={{ padding: "11px 14px", fontSize: 11, color: C.muted }}>{r.author}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── SECURITY ─────────────────────────────────────────────────── */}
        {activeTab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {findings.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "40px 24px", textAlign: "center", fontSize: 12, color: C.muted }}>No security findings — sync GitHub first</div>
            ) : findings.map((f, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${f.severity === "Critical" ? C.red : f.severity === "High" ? C.orange : C.yellow}`, borderRadius: "0 11px 11px 0", padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.repository}</span>
                      <span style={statusPill(f.severity)}>{f.severity}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 3 }}>⚠ {f.finding}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{f.risk}</div>
                  </div>
                  {(() => {
                    const rec = recommendations.find(r => r.repository === f.repository);
                    if (!rec) return null;
                    return (
                      <div style={{ display: "flex", gap: 5, flexShrink: 0, marginLeft: 14 }}>
                        <button onClick={() => openAction(rec, "jira")} className="act-btn" style={{ background: "#00b4d818", color: C.teal, border: `1px solid ${C.teal}40`, borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>🎫 Jira</button>
                        <button onClick={() => openAction(rec, "slack")} className="act-btn" style={{ background: "#a78bfa18", color: C.purple, border: `1px solid ${C.purple}40`, borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>💬 Slack</button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI INSIGHTS ──────────────────────────────────────────────── */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {recommendations.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>No AI insights yet</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Click "Generate AI Insights" in the top bar to analyse your repos with AI.</div>
                <div style={{ fontSize: 11, color: C.dim }}>Requires repos to be synced first.</div>
              </div>
            ) : recommendations.map((r, i) => (
              <div key={i} className="card-h" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: 18, opacity: archivedRepos.has(r.repository) ? 0.5 : 1, transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>📁 {r.repository}</div>
                    {archivedRepos.has(r.repository) && <span style={pill(C.green, "#22c55e18", "")}>✓ Archived</span>}
                  </div>
                  {!archivedRepos.has(r.repository) && (
                    <div style={{ display: "flex", gap: 5 }}>
                      {[
                        { action: "jira",    icon: "🎫", label: "Jira",    color: C.teal,   bg: "#00b4d818" },
                        { action: "email",   icon: "📧", label: "Email",   color: C.cyan,   bg: "#06b6d418" },
                        { action: "slack",   icon: "💬", label: "Slack",   color: C.purple, bg: "#a78bfa18" },
                        { action: "archive", icon: "📦", label: "Archive", color: C.green,  bg: "#22c55e18" },
                      ].map(btn => (
                        <button
                          key={btn.action}
                          onClick={() => btn.action === "archive" ? handleArchive(r) : openAction(r, btn.action)}
                          className="act-btn"
                          style={{ background: btn.bg, color: btn.color, border: `1px solid ${btn.color}40`, borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          {btn.icon} {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 9 }}>
                  {[
                    { label: "Recommendation", value: r.recommendation, color: C.accent,  bg: `${C.accent}12` },
                    { label: "Business Impact", value: r.business_impact, color: C.yellow, bg: "#f59e0b12" },
                    { label: "Security Risk",   value: r.security_risk,  color: C.red,    bg: "#ef444412" },
                  ].map(card => (
                    <div key={card.label} style={{ background: card.bg, borderRadius: 7, padding: "11px 13px", borderTop: `2px solid ${card.color}` }}>
                      <div style={{ fontSize: 9, color: card.color, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</div>
                      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.55 }}>{card.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#22c55e0e", borderRadius: 7, padding: "9px 13px", borderLeft: `2px solid ${C.green}` }}>
                  <div style={{ fontSize: 9, color: C.green, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Suggested Action</div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.55 }}>{r.suggested_action}</div>
                </div>
                {r.estimated_monthly_waste && (
                  <div style={{ marginTop: 9, display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 10, color: C.purple, background: "#a78bfa12", padding: "2px 9px", borderRadius: 99 }}>
                      💰 Est. savings: ${r.estimated_monthly_waste}/month if archived
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── COST WASTE ───────────────────────────────────────────────── */}
        {activeTab === "cost" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
              {[
                { label: "Monthly Waste",          value: `$${displayCostWaste.total_monthly_waste_usd.toLocaleString()}`, color: C.yellow },
                { label: "Annual Waste",            value: `$${displayCostWaste.total_annual_waste_usd.toLocaleString()}`,  color: C.red },
                { label: "Repos Draining Budget",   value: displayCostWaste.repo_count,                                    color: C.purple },
              ].map(card => (
                <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 7 }}>{card.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, overflow: "hidden" }}>
              <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 13 }}>Per-Repository Breakdown</div>
              {displayCostWaste.repositories.length === 0 ? (
                <div style={{ padding: "30px 24px", textAlign: "center", fontSize: 12, color: C.muted }}>No cost data — sync GitHub to load your repos</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.surface }}>
                      {["Repository", "Days Inactive", "Visibility", "Monthly Cost", "Annual Cost", "Action"].map(h => (
                        <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayCostWaste.repositories.map((r: any, i: number) => (
                      <tr key={i} className="row-hover" style={{ borderTop: `1px solid ${C.border}`, opacity: archivedRepos.has(r.repository) ? 0.4 : 1 }}>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 500 }}>{r.repository}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: r.days_inactive > 180 ? C.red : C.yellow }}>{r.days_inactive}d</td>
                        <td style={{ padding: "10px 14px" }}><span style={pill(r.is_public ? C.orange : C.muted, r.is_public ? "#fb923c18" : C.border, "")}>{r.is_public ? "Public" : "Private"}</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.yellow }}>${r.monthly_waste_usd}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.red }}>${r.annual_waste_usd.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px" }}>
                          {archivedRepos.has(r.repository) ? (
                            <span style={{ fontSize: 10, color: C.green }}>✓ Archived</span>
                          ) : (() => {
                            const rec = recommendations.find(rec => rec.repository === r.repository);
                            return rec ? (
                              <button onClick={() => handleArchive(rec)} className="act-btn" style={{ background: "#22c55e18", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>📦 Archive</button>
                            ) : null;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── REPO HEALTH ──────────────────────────────────────────────── */}
        {activeTab === "health" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, overflow: "hidden" }}>
            {health.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 12, color: C.muted }}>No health data — sync GitHub first</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Repository", "Status", "Days Inactive", "Last Author", "Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {health.map((item, i) => (
                    <tr key={i} className="row-hover" style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 500 }}>{item.repository}</td>
                      <td style={{ padding: "11px 14px" }}><span style={statusPill(item.status)}>{item.status}</span></td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: item.days_inactive > 180 ? C.red : item.days_inactive > 90 ? C.yellow : C.text }}>{item.days_inactive}d</td>
                      <td style={{ padding: "11px 14px", fontSize: 11, color: C.muted }}>{item.author}</td>
                      <td style={{ padding: "11px 14px" }}>
                        {(item.status === "Critical" || item.status === "Warning") && (() => {
                          const rec = recommendations.find(r => r.repository === item.repository);
                          if (!rec || archivedRepos.has(item.repository)) return archivedRepos.has(item.repository) ? <span style={{ fontSize: 10, color: C.green }}>✓ Archived</span> : null;
                          return (
                            <div style={{ display: "flex", gap: 4 }}>
                              {[
                                { a: "jira",    icon: "🎫", color: C.teal,   bg: "#00b4d818" },
                                { a: "slack",   icon: "💬", color: C.purple, bg: "#a78bfa18" },
                                { a: "email",   icon: "📧", color: C.cyan,   bg: "#06b6d418" },
                                { a: "archive", icon: "📦", color: C.green,  bg: "#22c55e18" },
                              ].map(btn => (
                                <button key={btn.a} onClick={() => btn.a === "archive" ? handleArchive(rec) : openAction(rec, btn.a)} className="act-btn" title={btn.a} style={{ background: btn.bg, color: btn.color, border: `1px solid ${btn.color}40`, borderRadius: 5, padding: "3px 7px", cursor: "pointer", fontSize: 10 }}>{btn.icon}</button>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
