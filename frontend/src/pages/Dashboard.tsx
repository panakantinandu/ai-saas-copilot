import { useEffect, useState, useRef } from "react";
// const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "/_/backend";
const token = sessionStorage.getItem("gh_token") ?? "";
const authHeaders = {
  "Content-Type": "application/json",
  "X-Auth-Token": token,
};
// ─── Types ──────────────────────────────────────────────────────────────────
interface Summary { total_repositories: number; dormant_repositories: number; active_repositories: number; critical_repositories: number; public_repositories: number; estimated_monthly_waste: number; }
interface DormantRepo { repository: string; author: string; days_inactive: number; }
interface Rec { repository: string; recommendation: string; business_impact: string; security_risk: string; suggested_action: string; estimated_monthly_waste?: number; }
interface Health { repository: string; status: string; days_inactive: number; author: string; }
interface Finding { repository: string; severity: string; finding: string; risk: string; category: string; }
interface RiskScore { repository: string; risk_score: number; days_inactive: number; is_public: boolean; author: string; }
interface CostWaste { repositories: any[]; total_monthly_waste_usd: number; total_annual_waste_usd: number; repo_count: number; }
interface ChatMessage { role: "user" | "assistant"; content: string; }

// ─── Mock API ────────────────────────────────────────────────────────────────
const MOCK_SUMMARY: Summary = { total_repositories: 24, dormant_repositories: 9, active_repositories: 13, critical_repositories: 5, public_repositories: 8, estimated_monthly_waste: 3240 };
const MOCK_RISK: RiskScore[] = [
  { repository: "legacy-auth-service", risk_score: 94, days_inactive: 412, is_public: true, author: "maya.chen" },
  { repository: "old-data-pipeline", risk_score: 87, days_inactive: 380, is_public: true, author: "dev-team" },
  { repository: "temp-migration-scripts", risk_score: 82, days_inactive: 290, is_public: false, author: "alex.smith" },
  { repository: "backup-prod-db", risk_score: 79, days_inactive: 265, is_public: true, author: "ops-bot" },
  { repository: "test-infra-v1", risk_score: 71, days_inactive: 198, is_public: false, author: "jenkins" },
  { repository: "demo-internal-api", risk_score: 65, days_inactive: 175, is_public: true, author: "priya.rao" },
  { repository: "copy-frontend-2023", risk_score: 58, days_inactive: 142, is_public: false, author: "frontend-team" },
  { repository: "secret-keys-backup", risk_score: 91, days_inactive: 340, is_public: true, author: "admin" },
];
const MOCK_FINDINGS: Finding[] = [
  { repository: "legacy-auth-service", severity: "Critical", finding: "Public repo inactive > 1 year", risk: "High probability of exposed secrets and vulnerable deps being actively scanned", category: "critical_abandoned" },
  { repository: "secret-keys-backup", severity: "Critical", finding: "Repo name contains 'secret' — public", risk: "Name signals credential storage; automated scanners target these immediately", category: "naming_risk" },
  { repository: "old-data-pipeline", severity: "High", finding: "Public repository inactive > 180 days", risk: "Potential abandoned public codebase with unpatched vulnerabilities", category: "abandoned_public" },
  { repository: "backup-prod-db", severity: "High", finding: "Repo name contains 'backup' in public namespace", risk: "May contain sensitive data or database credentials", category: "naming_risk" },
  { repository: "temp-migration-scripts", severity: "Medium", finding: "Temp repository left in production namespace", risk: "Temporary repos often contain hardcoded credentials", category: "naming_risk" },
  { repository: "demo-internal-api", severity: "Medium", finding: "Demo repo publicly visible", risk: "May expose internal architecture and API design patterns", category: "naming_risk" },
  { repository: "test-infra-v1", severity: "Medium", finding: "Public repo with no recent dependency updates", risk: "Likely contains unpatched CVEs in dependencies", category: "stale_dependencies" },
];
const MOCK_RECS: Rec[] = [
  { repository: "legacy-auth-service", recommendation: "Immediately archive — repo has been dead for over a year", business_impact: "Consuming CI/CD resources and cluttering team namespace with zero ROI for 412 days", security_risk: "CRITICAL: Public abandoned repo may expose hardcoded secrets, stale API keys, or vulnerable dependencies to internet scanners", suggested_action: "Run: gh repo archive legacy-auth-service — notify team leads, remove from active monitoring", estimated_monthly_waste: 375 },
  { repository: "old-data-pipeline", recommendation: "Archive within 2 weeks — critically dormant", business_impact: "Potential orphaned dependencies and outdated security patches pose increasing risk", security_risk: "CRITICAL: Public repo may expose secrets or outdated dependencies", suggested_action: "Assign DRI, schedule review, archive if no response in 14 days", estimated_monthly_waste: 375 },
  { repository: "temp-migration-scripts", recommendation: "Archive within 2 weeks — critically dormant", business_impact: "Potential orphaned dependencies and outdated security patches", security_risk: "MEDIUM: Private but stale — outdated auth tokens may be committed", suggested_action: "Ping last committer, determine if scripts are still needed, archive otherwise", estimated_monthly_waste: 240 },
  { repository: "backup-prod-db", recommendation: "Immediately archive — public backup repo is a critical risk", business_impact: "Consuming storage and CI/CD minutes with zero ROI", security_risk: "CRITICAL: Public backup repo signals credential storage to scanners", suggested_action: "Archive immediately and audit commit history for exposed credentials", estimated_monthly_waste: 375 },
  { repository: "secret-keys-backup", recommendation: "Immediately archive — name suggests credential exposure", business_impact: "This repository name is a beacon for automated credential harvesters", security_risk: "CRITICAL: Public repo named 'secret-keys-backup' is actively targeted by scanners", suggested_action: "Archive immediately, rotate all credentials that may have been committed, audit history", estimated_monthly_waste: 375 },
];
const MOCK_HEALTH: Health[] = [
  { repository: "legacy-auth-service", status: "Critical", days_inactive: 412, author: "maya.chen" },
  { repository: "secret-keys-backup", status: "Critical", days_inactive: 340, author: "admin" },
  { repository: "old-data-pipeline", status: "Critical", days_inactive: 380, author: "dev-team" },
  { repository: "backup-prod-db", status: "Critical", days_inactive: 265, author: "ops-bot" },
  { repository: "temp-migration-scripts", status: "Warning", days_inactive: 290, author: "alex.smith" },
  { repository: "demo-internal-api", status: "Warning", days_inactive: 175, author: "priya.rao" },
  { repository: "test-infra-v1", status: "Warning", days_inactive: 198, author: "jenkins" },
  { repository: "copy-frontend-2023", status: "Warning", days_inactive: 142, author: "frontend-team" },
  { repository: "main-api", status: "Healthy", days_inactive: 2, author: "ci-bot" },
  { repository: "frontend-app", status: "Healthy", days_inactive: 1, author: "deploy-bot" },
  { repository: "infra-terraform", status: "Healthy", days_inactive: 5, author: "platform-team" },
];
const MOCK_COST: CostWaste = {
  total_monthly_waste_usd: 3240, total_annual_waste_usd: 38880, repo_count: 9,
  repositories: MOCK_RISK.map(r => ({ repository: r.repository, days_inactive: r.days_inactive, is_public: r.is_public, monthly_waste_usd: r.is_public ? 375 : 240, annual_waste_usd: r.is_public ? 4500 : 2880 }))
};
const MOCK_DORMANT: DormantRepo[] = MOCK_RISK.map(r => ({ repository: r.repository, author: r.author, days_inactive: r.days_inactive }));

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg: "#080d1a", surface: "#0c1526", card: "#101c30", border: "#1a2c44", borderHover: "#2a4060",
  text: "#e2e8f0", muted: "#64748b", dim: "#1e3050",
  accent: "#6366f1", accentHover: "#818cf8", accentGlow: "#6366f130",
  green: "#22c55e", yellow: "#f59e0b", red: "#ef4444", redDark: "#dc2626",
  purple: "#a78bfa", teal: "#2dd4bf", orange: "#fb923c", cyan: "#06b6d4",
};

const pill = (color: string, bg: string, _text: string) => ({
  display: "inline-flex" as const, alignItems: "center" as const, gap: 4, background: bg, color,
  padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap" as const,
});
const statusPill = (s: string) => {
  if (s === "Critical" || s === "critical_abandoned") return pill(C.red, "#ef444420", s);
  if (s === "High") return pill(C.red, "#ef444420", s);
  if (s === "Medium") return pill(C.yellow, "#f59e0b20", s);
  if (s === "Warning") return pill(C.yellow, "#f59e0b20", s);
  if (s === "Healthy") return pill(C.green, "#22c55e20", s);
  return pill(C.purple, "#a78bfa20", s);
};

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? C.red : score >= 40 ? C.yellow : C.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 28 }}>{score}</span>
    </div>
  );
}

function Spinner() {
  return <div style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

// ─── Action Modal ─────────────────────────────────────────────────────────────
function ActionModal({ repo, action, onClose }: { repo: Rec | null; action: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!repo) return null;

  const MOCK_RESULTS: Record<string, any> = {
    jira: {
      title: "Jira Ticket Created",
      icon: "🎫",
      color: C.teal,
      fields: [
        { label: "Ticket ID", value: `OPS-${Math.floor(Math.random() * 9000) + 1000}` },
        { label: "Project", value: "OPS — SaaS Operations" },
        { label: "Summary", value: `Archive dormant repository: ${repo.repository}` },
        { label: "Priority", value: repo.security_risk.startsWith("CRITICAL") ? "🔴 Critical" : "🟡 High" },
        { label: "Assignee", value: "Platform Engineering" },
        { label: "Due Date", value: new Date(Date.now() + 14 * 864e5).toLocaleDateString() },
        { label: "Description", value: `${repo.business_impact} — ${repo.suggested_action}` },
      ]
    },
    email: {
      title: "Email Notification Sent",
      icon: "📧",
      color: C.cyan,
      fields: [
        { label: "To", value: `team-leads@company.com, security@company.com` },
        { label: "Subject", value: `[Action Required] Archive: ${repo.repository}` },
        { label: "Priority", value: "High" },
        { label: "Delivered To", value: "3 recipients" },
        { label: "Body Preview", value: `AI Ops Copilot has flagged ${repo.repository} for immediate action. Risk score: ${MOCK_RISK.find(r => r.repository === repo.repository)?.risk_score ?? "N/A"}/100. ${repo.recommendation}` },
      ]
    },
    slack: {
      title: "Slack Notification Sent",
      icon: "💬",
      color: C.purple,
      fields: [
        { label: "Channel", value: "#ops-alerts" },
        { label: "Also notified", value: "@platform-eng, @security-team" },
        { label: "Message", value: `🚨 *${repo.repository}* flagged by AI Copilot — ${repo.recommendation}` },
        { label: "Thread created", value: "Yes — replies will be tracked" },
        { label: "Timestamp", value: new Date().toLocaleTimeString() },
      ]
    },
    archive: {
      title: "Repository Archived",
      icon: "📦",
      color: C.green,
      fields: [
        { label: "Repository", value: repo.repository },
        { label: "Status", value: "✓ Archived successfully" },
        { label: "Archived at", value: new Date().toISOString() },
        { label: "Visibility", value: "Now read-only on GitHub" },
        { label: "Monthly savings", value: `$${repo.estimated_monthly_waste ?? 375}/month recovered` },
        { label: "CI/CD removed", value: "Workflows disabled" },
      ]
    },
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      // await fetch(`${BASE_URL}/actions/${action}`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify({ repository: repo.repository, priority: "High", message: "" })
        
      // });
      await fetch(`${BASE_URL}/auth/github/sync`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
    } catch (_) {
      // backend may be offline; proceed with mock result anyway
    }
    setResult(MOCK_RESULTS[action]);  //  the pre-shaped mock, not raw API response
    setLoading(false);
    setDone(true);
  };

  const jsonFetch = (url: string) => fetch(url, { headers: authHeaders });

  
  const ACTION_META: Record<string, { label: string; color: string; icon: string; desc: string }> = {
    jira:    { label: "Create Jira Ticket", color: C.teal,   icon: "🎫", desc: "Opens a tracked task in your Jira project board" },
    email:   { label: "Generate Email",     color: C.cyan,   icon: "📧", desc: "Sends an alert to team leads and security team" },
    slack:   { label: "Notify Slack",       color: C.purple, icon: "💬", desc: "Posts an alert to #ops-alerts channel" },
    archive: { label: "Archive Repository", color: C.green,  icon: "📦", desc: "Marks repo as read-only and disables workflows" },
  };
  const meta = ACTION_META[action];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: 520, maxWidth: "100%", overflow: "hidden", animation: "fadeIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{meta.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{meta.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>for {repo.repository}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {!done ? (
            <>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Repository Details</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📁 {repo.repository}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{repo.recommendation}</div>
                <div style={{ fontSize: 12, color: C.yellow, marginTop: 8 }}>⚠ {repo.security_risk.replace(/^(CRITICAL|HIGH|MEDIUM|LOW): /, "")}</div>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
                {meta.desc}. This action is <span style={{ color: C.yellow }}>mocked</span> — no real API calls will be made.
              </div>
              <button onClick={handleRun} disabled={loading} style={{ width: "100%", background: meta.color, color: "white", border: "none", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><Spinner /> Processing...</> : <>{meta.icon} {meta.label}</>}
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{result.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: result.color }}>{result.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Mock response — simulated successfully</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {result.fields.map((f: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "8px 12px", background: C.card, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, minWidth: 110, paddingTop: 1 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, flex: 1 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={onClose} style={{ width: "100%", background: result.color, color: "white", border: "none", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
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
  // const token  = localStorage.getItem("github_token");             // set by OAuth callback
  
  const [dataLoading, setDataLoading]     = useState(true);
  const [summary,     setSummary]         = useState<Summary>(MOCK_SUMMARY);
  const [_dormantRepos,setDormantRepos]    = useState<DormantRepo[]>(MOCK_DORMANT);
  const [recommendations,setRecommendations] = useState<Rec[]>(MOCK_RECS);
  const [health,      setHealth]          = useState<Health[]>(MOCK_HEALTH);
  const [findings,    setFindings]        = useState<Finding[]>(MOCK_FINDINGS);
  const [riskScores,  setRiskScores]      = useState<RiskScore[]>(MOCK_RISK);
  const [costWaste,   setCostWaste]       = useState<CostWaste>(MOCK_COST);
  
  // const [costWaste] = useState<CostWaste>(MOCK_COST);
  const [activeTab, setActiveTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your SaaS Ops Copilot. Ask me about risks, costs, or actions — try 'which repo is most at risk?' or 'top 3 actions?'" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [archivedRepos, setArchivedRepos] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [modalRepo, setModalRepo] = useState<Rec | null>(null);
  const [modalAction, setModalAction] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => {
    // Demo mode → keep mock data, no fetch needed
    if (isDemo) { setDataLoading(false); return;}
  
    // Credentials come from the httpOnly cookie — no token in JS
    const fetchOpts = { credentials: "include" as const };
    const jsonFetch = (url: string) => fetch(url, { ...fetchOpts, headers: { "Content-Type": "application/json" } });
    
    async function loadRealData() {
      try {
        // 1. Sync the user's repos into the DB first (so analytics have real data)
        // await fetch(`${BASE_URL}/auth/github/sync`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   credentials: "include",
        //   body: JSON.stringify({}),
        // });
        await fetch(`${BASE_URL}/auth/github/sync`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({}),
        });
  
        // 2. Fetch all dashboard data in parallel
        const [
          summaryRes,
          dormantRes,
          riskRes,
          costRes,
          findingsRes,
        ] = await Promise.all([
          jsonFetch(`${BASE_URL}/analytics/repository-summary`),
          jsonFetch(`${BASE_URL}/analytics/dormant-repositories`),
          jsonFetch(`${BASE_URL}/analytics/risk-scores`),
          jsonFetch(`${BASE_URL}/analytics/cost-waste`),
          jsonFetch(`${BASE_URL}/security/findings`),
        ]);
  
        // Clone BEFORE first .json() read
        const riskResClone = riskRes.clone();

        if (summaryRes.ok)  setSummary(await summaryRes.json());
        if (dormantRes.ok)  setDormantRepos(await dormantRes.json());
        if (riskRes.ok)     setRiskScores(await riskRes.json());        // first read
        if (costRes.ok)     setCostWaste(await costRes.json());
        if (findingsRes.ok) setFindings(await findingsRes.json());

        // Now use the clone for health derivation
        if (riskResClone.ok) {
          const risks: RiskScore[] = await riskResClone.json();         // second read — safe
          setHealth(risks.map(r => ({
            repository:    r.repository,
            status:        r.risk_score >= 70 ? "Critical" : r.risk_score >= 40 ? "Warning" : "Healthy",
            days_inactive: r.days_inactive,
            author:        r.author,
          })));
        }
  
        // 5. Recommendations come from AI endpoint — optional, falls back to mock
        const recsRes = await fetch(`${BASE_URL}/ai/recommendations`);
        if (recsRes.ok) setRecommendations(await recsRes.json());
  
      } catch (err) {
        // Network error — keep mock data so dashboard still renders
        console.error("Failed to load real data, showing mock data:", err);
      } finally {
        setDataLoading(false);
      }
    }
    loadRealData();
  }, [isDemo]); // runs once on mount
  
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const openAction = (repo: Rec, action: string) => {
    setModalRepo(repo);
    setModalAction(action);
  };

  const handleArchive = (repo: Rec) => {
    openAction(repo, "archive");
    setTimeout(() => { setArchivedRepos(prev => new Set([...prev, repo.repository])); }, 2000);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(m => [...m, { role: "user", content: userMsg }]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 500));

    const lower = userMsg.toLowerCase();
    let response = "";

    // Use REAL state variables
    const topRisk = [...riskScores].sort((a, b) => b.risk_score - a.risk_score)[0];
    const totalWaste = costWaste.total_monthly_waste_usd;
    const dormantCount = costWaste.repo_count;
    const criticals = findings.filter(f => f.severity === "Critical");
    const top3 = [...riskScores].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3);

    if (lower.includes("risk") || lower.includes("dangerous") || lower.includes("worst")) {
      response = topRisk
        ? `The highest-risk repo is **${topRisk.repository}** (score: ${topRisk.risk_score}/100, ${topRisk.days_inactive} days inactive, ${topRisk.is_public ? "public" : "private"}). Archive it immediately.`
        : "No risk data loaded yet.";

    } else if (lower.includes("money") || lower.includes("cost") || lower.includes("waste")) {
      response = `You're wasting **$${totalWaste.toLocaleString()}/month** ($${costWaste.total_annual_waste_usd.toLocaleString()}/year) across ${dormantCount} dormant repos.`;

    } else if (lower.includes("security") || lower.includes("vulnerable")) {
      response = criticals.length
        ? `You have **${criticals.length} critical finding(s)**. Worst: "${criticals[0].finding}" in \`${criticals[0].repository}\`.`
        : "No critical security findings.";

    } else if (lower.includes("top") || lower.includes("action") || lower.includes("fix")) {
      response = top3.length
        ? `Top 3 repos to act on:\n${top3.map((r, i) => `${i + 1}. **${r.repository}** (score: ${r.risk_score}, ${r.days_inactive}d inactive)`).join("\n")}`
        : "No repository data loaded yet.";

    } else if (lower.includes("repos") || lower.includes("repositories") || lower.includes("list")) {
      response = riskScores.length
        ? `You have **${summary.total_repositories} repos** — ${summary.active_repositories} active, ${summary.dormant_repositories} dormant, ${summary.critical_repositories} critical.`
        : "No repository data loaded yet.";

    } else {
      response = topRisk
        ? `Biggest concern: **${topRisk.repository}** (risk: ${topRisk.risk_score}/100). Wasting ~$${totalWaste.toLocaleString()}/month on ${dormantCount} dormant repos. Ask me about risks, costs, security, or top actions.`
        : "Still loading your data — try again in a moment.";
    }

    setChatMessages(m => [...m, { role: "assistant", content: response }]);
    setChatLoading(false);
  };

  const criticalFindings = findings.filter(f => f.severity === "Critical" || f.severity === "High");
  const tabs = [
    { id: "overview", label: "Overview", icon: "⬡" }, { id: "risk", label: "Risk Scores", icon: "⚠" },
    { id: "security", label: "Security", icon: "🔒" }, { id: "ai", label: "AI Insights", icon: "✦" },
    { id: "cost", label: "Cost Waste", icon: "$" }, { id: "health", label: "Repo Health", icon: "⬡" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {dataLoading && !isDemo && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          background: "#6366f1", color: "white",
          padding: "8px 24px", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</span>
          Syncing your GitHub repos — real data loading...
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 8px #6366f140; } 50% { box-shadow: 0 0 20px #6366f160; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 2px; }
        .tab-btn:hover { background: ${C.border} !important; }
        .row-hover:hover { background: ${C.border} !important; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px #00000040; }
        .card-hover:hover { border-color: ${C.borderHover} !important; }
        .action-btn { transition: all 0.15s ease !important; }
      `}</style>

      {/* Top Bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "glow 3s infinite" }}>✦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>SaaS Ops Copilot</div>
            <div style={{ fontSize: 11, color: C.muted }}>AI-Powered Repository Intelligence</div>
          </div>
          <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 6, background: "#22c55e15", border: `1px solid #22c55e30`, borderRadius: 6, padding: "3px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: C.green, fontWeight: 500 }}>Demo Mode — {summary.total_repositories} repos monitored</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setChatOpen(o => !o)} className="action-btn" style={{ background: chatOpen ? C.accent : C.card, color: chatOpen ? "white" : C.text, border: `1px solid ${chatOpen ? C.accent : C.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            ✦ AI Copilot {chatOpen ? "▲" : "▼"}
          </button>
          <button onClick={() => showToast("✓ GitHub synced — 24 repos updated")} className="action-btn" style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            ⟳ Sync GitHub
          </button>
          <button onClick={() => showToast("✓ AI insights generated for all repositories")} className="action-btn" style={{ background: C.accent, color: "white", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            ✦ Generate AI Insights
          </button>
        </div>
      </div>

      {/* AI Chat Drawer */}
      {chatOpen && (
        <div style={{ position: "fixed", right: 0, top: 64, bottom: 0, width: 400, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 40, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>✦ AI Copilot Chat</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Ask anything about your repositories</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.2s ease" }}>
                <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? C.accent : C.card, border: msg.role === "assistant" ? `1px solid ${C.border}` : "none", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: C.card, borderRadius: "14px 14px 14px 4px", width: "fit-content", border: `1px solid ${C.border}` }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask about risks, costs, actions..." style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
            <button onClick={sendChat} disabled={chatLoading} style={{ background: C.accent, color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>↑</button>
          </div>
          <div style={{ padding: "8px 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Which repo is riskiest?", "How much am I wasting?", "Top 3 actions?", "How do I use Jira?"].map(q => (
              <button key={q} onClick={() => setChatInput(q)} style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 99, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 500, zIndex: 100, animation: "fadeIn 0.2s ease", color: toast.startsWith("✓") ? C.green : C.red, boxShadow: "0 8px 24px #00000040" }}>
          {toast}
        </div>
      )}

      {/* Action Modal */}
      {modalRepo && <ActionModal repo={modalRepo} action={modalAction} onClose={() => { setModalRepo(null); setModalAction(""); }} />}

      <div style={{ padding: "28px 32px", marginRight: chatOpen ? 400 : 0, transition: "margin-right 0.3s ease" }}>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total Repos", value: summary.total_repositories, color: C.accent, sub: "monitored" },
            { label: "Active", value: summary.active_repositories, color: C.green, sub: "< 30 days" },
            { label: "Dormant", value: summary.dormant_repositories, color: C.yellow, sub: "> 30 days" },
            { label: "Critical", value: summary.critical_repositories, color: C.red, sub: "> 90 days" },
            { label: "Public", value: summary.public_repositories, color: C.orange, sub: "exposed" },
            { label: "Monthly Waste", value: `$${summary.estimated_monthly_waste.toLocaleString()}`, color: C.purple, sub: "CI/CD cost" },
          ].map(card => (
            <div key={card.label} className="card-hover" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", transition: "border-color 0.2s" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Alert Bar */}
        {criticalFindings.length > 0 && (
          <div style={{ background: "#ef444410", border: `1px solid ${C.red}40`, borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, animation: "pulse 1.5s infinite", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: C.red, fontSize: 13 }}>{criticalFindings.length} Critical/High Security Findings Detected</span>
              <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>Public abandoned repos are being actively scanned for exposed secrets</span>
            </div>
            <button onClick={() => setActiveTab("security")} className="action-btn" style={{ background: C.red, color: "white", border: "none", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View Now</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: C.card, padding: 4, borderRadius: 10, marginBottom: 24, width: "fit-content", border: `1px solid ${C.border}` }}>
          {tabs.map(t => (
            <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{ padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: activeTab === t.id ? C.accent : "transparent", color: activeTab === t.id ? "white" : C.muted, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────── */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Top Risk Repositories</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {riskScores.slice(0, 8).map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        {r.repository}
                        {r.is_public && <span style={{ fontSize: 9, background: "#fb923c20", color: C.orange, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>PUBLIC</span>}
                        {archivedRepos.has(r.repository) && <span style={{ fontSize: 9, background: "#22c55e20", color: C.green, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>ARCHIVED</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{r.days_inactive}d inactive · {r.author}</div>
                    </div>
                    <RiskBar score={r.risk_score} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Security Findings Summary</div>
                {[
                  { label: "Critical", items: findings.filter(f => f.severity === "Critical"), color: "#9b1c1c", text: C.red },
                  { label: "High", items: findings.filter(f => f.severity === "High"), color: "#ef444420", text: C.red },
                  { label: "Medium", items: findings.filter(f => f.severity === "Medium"), color: "#f59e0b20", text: C.yellow },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: row.color, borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: row.text, fontWeight: 500 }}>{row.label} Severity</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: row.text }}>{row.items.length}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Cost Waste Snapshot</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Monthly waste</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: C.purple }}>${costWaste.total_monthly_waste_usd.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Annual waste</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: C.red }}>${costWaste.total_annual_waste_usd.toLocaleString()}</span>
                </div>
                <div style={{ height: 1, background: C.border, marginBottom: 12 }} />
                <div style={{ fontSize: 12, color: C.muted }}>{costWaste.repo_count} dormant repos consuming budget</div>
              </div>
            </div>
          </div>
        )}

        {/* ── RISK TAB ─────────────────────────────────── */}
        {activeTab === "risk" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {["Repository", "Risk Score", "Days Inactive", "Visibility", "Last Author"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskScores.map((r, i) => (
                  <tr key={i} className="row-hover" style={{ borderTop: `1px solid ${C.border}`, transition: "background 0.1s", opacity: archivedRepos.has(r.repository) ? 0.4 : 1 }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>
                      {r.repository}
                      {archivedRepos.has(r.repository) && <span style={{ marginLeft: 8, fontSize: 10, color: C.green, background: "#22c55e20", padding: "1px 6px", borderRadius: 3 }}>ARCHIVED</span>}
                    </td>
                    <td style={{ padding: "12px 16px", width: 180 }}><RiskBar score={r.risk_score} /></td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: r.days_inactive > 180 ? C.red : C.yellow }}>{r.days_inactive}d</td>
                    <td style={{ padding: "12px 16px" }}><span style={pill(r.is_public ? C.orange : C.muted, r.is_public ? "#fb923c20" : C.border, "")}>{r.is_public ? "Public" : "Private"}</span></td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.muted }}>{r.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SECURITY TAB ─────────────────────────────── */}
        {activeTab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {findings.map((f, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${f.severity === "Critical" ? "#9b1c1c" : f.severity === "High" ? C.red : f.severity === "Medium" ? C.yellow : C.dim}`, borderRadius: "0 12px 12px 0", padding: "16px 20px", animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{f.repository}</span>
                      <span style={statusPill(f.severity)}>{f.severity}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>⚠ {f.finding}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{f.risk}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 16 }}>
                    {(() => { const rec = recommendations.find(r => r.repository === f.repository); if (!rec) return null;
                      return <>
                        <button onClick={() => openAction(rec, "jira")} className="action-btn" title="Create Jira Ticket" style={{ background: "#00b4d820", color: C.teal, border: `1px solid ${C.teal}40`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🎫 Jira</button>
                        <button onClick={() => openAction(rec, "slack")} className="action-btn" title="Notify Slack" style={{ background: "#a78bfa20", color: C.purple, border: `1px solid ${C.purple}40`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>💬 Slack</button>
                      </>;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI INSIGHTS TAB ──────────────────────────── */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Action legend */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>AVAILABLE ACTIONS:</div>
              {[
                { icon: "🎫", label: "Create Jira Ticket", color: C.teal, desc: "Opens tracked task" },
                { icon: "📧", label: "Generate Email",    color: C.cyan,   desc: "Notifies team leads" },
                { icon: "💬", label: "Notify Slack",      color: C.purple, desc: "Posts to #ops-alerts" },
                { icon: "📦", label: "Archive Repo",      color: C.green,  desc: "Disables & archives" },
              ].map(a => (
                <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: a.color }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {recommendations.map((r, i) => (
              <div key={i} className="card-hover" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, animation: "fadeIn 0.3s ease", transition: "border-color 0.2s", opacity: archivedRepos.has(r.repository) ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>📁 {r.repository}</div>
                    {archivedRepos.has(r.repository) && <span style={pill(C.green, "#22c55e20", "")}>✓ Archived</span>}
                  </div>
                  {/* Action Buttons Row */}
                  {!archivedRepos.has(r.repository) && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openAction(r, "jira")} className="action-btn" style={{ background: "#00b4d820", color: C.teal, border: `1px solid ${C.teal}50`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        🎫 Create Jira
                      </button>
                      <button onClick={() => openAction(r, "email")} className="action-btn" style={{ background: "#06b6d420", color: C.cyan, border: `1px solid ${C.cyan}50`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        📧 Email
                      </button>
                      <button onClick={() => openAction(r, "slack")} className="action-btn" style={{ background: "#a78bfa20", color: C.purple, border: `1px solid ${C.purple}50`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        💬 Slack
                      </button>
                      <button onClick={() => handleArchive(r)} className="action-btn" style={{ background: "#22c55e20", color: C.green, border: `1px solid ${C.green}50`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        📦 Archive
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
                  {[
                    { label: "Recommendation", value: r.recommendation, color: C.accent, bg: `${C.accent}15` },
                    { label: "Business Impact",  value: r.business_impact, color: C.yellow, bg: "#f59e0b15" },
                    { label: "Security Risk",    value: r.security_risk, color: C.red, bg: "#ef444415" },
                  ].map(card => (
                    <div key={card.label} style={{ background: card.bg, borderRadius: 8, padding: "12px 14px", borderTop: `2px solid ${card.color}` }}>
                      <div style={{ fontSize: 10, color: card.color, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{card.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#22c55e10", borderRadius: 8, padding: "10px 14px", borderLeft: `2px solid ${C.green}` }}>
                  <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Suggested Action</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{r.suggested_action}</div>
                </div>
                {r.estimated_monthly_waste && (
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 11, color: C.purple, background: "#a78bfa15", padding: "3px 10px", borderRadius: 99 }}>
                      💰 Est. savings: ${r.estimated_monthly_waste}/month if archived
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── COST WASTE TAB ───────────────────────────── */}
        {activeTab === "cost" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Monthly Waste", value: `$${costWaste.total_monthly_waste_usd.toLocaleString()}`, sub: "est. CI/CD + maintenance", color: C.yellow },
                { label: "Annual Waste", value: `$${costWaste.total_annual_waste_usd.toLocaleString()}`, sub: "if nothing is done today", color: C.red },
                { label: "Repos Draining Budget", value: costWaste.repo_count, sub: "dormant repos with no activity", color: C.purple },
              ].map(card => (
                <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>{card.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14 }}>Per-Repository Cost Breakdown</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Repository", "Days Inactive", "Visibility", "Monthly Cost", "Annual Cost", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costWaste.repositories.map((r: any, i: number) => (
                    <tr key={i} className="row-hover" style={{ borderTop: `1px solid ${C.border}`, transition: "background 0.1s", opacity: archivedRepos.has(r.repository) ? 0.4 : 1 }}>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{r.repository}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: r.days_inactive > 180 ? C.red : C.yellow }}>{r.days_inactive}d</td>
                      <td style={{ padding: "11px 16px" }}><span style={pill(r.is_public ? C.orange : C.muted, r.is_public ? "#fb923c20" : C.border, "")}>{r.is_public ? "Public" : "Private"}</span></td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: C.yellow }}>${r.monthly_waste_usd}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: C.red }}>${r.annual_waste_usd.toLocaleString()}</td>
                      <td style={{ padding: "11px 16px" }}>
                        {!archivedRepos.has(r.repository) ? (() => {
                          const rec = recommendations.find(rec => rec.repository === r.repository);
                          return rec ? (
                            <button onClick={() => handleArchive(rec)} className="action-btn" style={{ background: "#22c55e20", color: C.green, border: `1px solid ${C.green}50`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>📦 Archive</button>
                          ) : null;
                        })() : <span style={{ fontSize: 11, color: C.green }}>✓ Archived</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── HEALTH TAB ───────────────────────────────── */}
        {activeTab === "health" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {["Repository", "Status", "Days Inactive", "Last Author", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {health.map((item, i) => (
                  <tr key={i} className="row-hover" style={{ borderTop: `1px solid ${C.border}`, transition: "background 0.1s" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{item.repository}</td>
                    <td style={{ padding: "12px 16px" }}><span style={statusPill(item.status)}>{item.status}</span></td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: item.days_inactive > 180 ? C.red : item.days_inactive > 90 ? C.yellow : C.text }}>{item.days_inactive}d</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.muted }}>{item.author}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {(item.status === "Critical" || item.status === "Warning") && (() => {
                        const rec = recommendations.find(r => r.repository === item.repository);
                        return rec && !archivedRepos.has(item.repository) ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => openAction(rec, "jira")} className="action-btn" title="Create Jira" style={{ background: "#00b4d820", color: C.teal, border: `1px solid ${C.teal}40`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>🎫</button>
                            <button onClick={() => openAction(rec, "slack")} className="action-btn" title="Notify Slack" style={{ background: "#a78bfa20", color: C.purple, border: `1px solid ${C.purple}40`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>💬</button>
                            <button onClick={() => openAction(rec, "email")} className="action-btn" title="Send Email" style={{ background: "#06b6d420", color: C.cyan, border: `1px solid ${C.cyan}40`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>📧</button>
                            <button onClick={() => handleArchive(rec)} className="action-btn" title="Archive" style={{ background: "#22c55e20", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>📦</button>
                          </div>
                        ) : archivedRepos.has(item.repository) ? <span style={{ fontSize: 11, color: C.green }}>✓ Archived</span> : null;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
