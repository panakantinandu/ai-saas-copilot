
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import ConnectGithub from "./pages/ConnectGithub";

// function App() {
//   // GitHub redirects to /?token=xxx after OAuth. We save it then strip the URL.
//   const params = new URLSearchParams(window.location.search);
//   const oauthToken = params.get("token");
//   if (oauthToken) {
//     localStorage.setItem("github_token", oauthToken);
//     window.history.replaceState({}, "", "/");   // removes ?token= from address bar
//   }
//   // ── end new block ──────────────────────────────────────────────────────────

//   const token  = localStorage.getItem("github_token");           // original line 6
//   const isDemo = new URLSearchParams(window.location.search).get("demo") === "true"; // original line 7

//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={
//           (token || isDemo)
//             ? <Dashboard />
//             : <ConnectGithub />
//         } />
//         <Route path="/dashboard" element={<Dashboard />} />
//         <Route path="/connect"   element={<ConnectGithub />} />
//         <Route path="*"          element={<Navigate to="/" replace />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import ConnectGithub from "./pages/ConnectGithub";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── OAuth callback page ──────────────────────────────────────────────────────
// GitHub → backend → frontend/callback?code=xxx
// We immediately POST the code to /auth/github/exchange, which sets an
// httpOnly cookie and redirects to the dashboard. The real token is never
// stored in localStorage or visible in the URL.
function OAuthCallback() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      setStatus("error");
      return;
    }

    fetch(`${BASE_URL}/auth/github/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // needed so the browser stores the cookie
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Exchange failed");

        // Strip the code from the URL then go to the dashboard
        window.history.replaceState({}, "", "/");
        window.location.replace("/");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080d1a",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Login failed</div>
          <a href="/" style={{ color: "#6366f1", fontSize: 13 }}>
            Try again →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080d1a",
        color: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Finishing login…
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const isDemo =
    new URLSearchParams(window.location.search).get("demo") === "true";

  // We no longer check localStorage — authentication is managed by the httpOnly
  // cookie. Ask the backend if there's a live session instead.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isDemo) {
      setAuthed(false);
      return;
    }

    // demo skips auth check
    fetch(`${BASE_URL}/auth/github/me/session`, {
      credentials: "include",
    })
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  // Still checking
  if (authed === null && !isDemo) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/callback" element={<OAuthCallback />} />

        <Route
          path="/"
          element={
            authed || isDemo ? (
              <Dashboard />
            ) : (
              <ConnectGithub />
            )
          }
        />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/connect" element={<ConnectGithub />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;