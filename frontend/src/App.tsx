import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import ConnectGithub from "./pages/ConnectGithub";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

// ─── OAuth Callback ───────────────────────────────────────────────────────────
function OAuthCallback() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) { setStatus("error"); return; }

    fetch(`${BASE_URL}/auth/github/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Exchange failed");
        return res.json();
      })
      .then(data => {
        if (!data.token) throw new Error("No token in response");
        sessionStorage.setItem("gh_token", data.token);
        // Navigate to dashboard — no full reload needed
        window.location.href = "/";
      })
      .catch(err => {
        console.error("Exchange error:", err);
        setStatus("error");
      });
  }, []);

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", background: "#080d1a", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Login failed — please try again</div>
          <a href="/" style={{ color: "#6366f1", fontSize: 13 }}>← Back</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080d1a", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>Finishing login…</div>
      </div>
    </div>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate() {
  const location = useLocation();
  const isDemo = new URLSearchParams(location.search).get("demo") === "true";
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Never run auth check on /callback — let OAuthCallback handle it fully
    if (location.pathname === "/callback") return;

    if (isDemo) { setAuthed(false); return; }

    const token = sessionStorage.getItem("gh_token");
    if (!token) { setAuthed(false); return; }

    fetch(`${BASE_URL}/auth/github/me/session`, {
      headers: { "X-Auth-Token": token },
    })
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, [location.pathname]);

  // On /callback — always render OAuthCallback, never redirect
  if (location.pathname === "/callback") {
    return <OAuthCallback />;
  }

  // Still checking session
  if (authed === null && !isDemo) {
    return (
      <div style={{ minHeight: "100vh", background: "#080d1a" }} />
    );
  }

  if (location.pathname === "/dashboard" || authed || isDemo) {
    return <Dashboard />;
  }

  return <ConnectGithub />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AuthGate />} />
      </Routes>
    </BrowserRouter>
  );
}
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { useEffect, useState } from "react";
// import Dashboard from "./pages/Dashboard";
// import ConnectGithub from "./pages/ConnectGithub";

// // const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// // ─── OAuth callback page ──────────────────────────────────────────────────────
// // GitHub → backend → frontend/callback?code=xxx
// // We immediately POST the code to /auth/github/exchange, which sets an
// // httpOnly cookie and redirects to the dashboard. The real token is never
// // stored in localStorage or visible in the URL.

// const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
// function OAuthCallback() {
//   const [status, setStatus] = useState<"loading" | "error">("loading");

//   useEffect(() => {
//     const code = new URLSearchParams(window.location.search).get("code");
//     if (!code) { setStatus("error"); return; }

//     fetch(`${BASE_URL}/auth/github/exchange`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ code }),
//     })
//       .then(res => {
//         if (!res.ok) throw new Error("Exchange failed");
//         return res.json();
//       })
//       .then(data => {
//         // Store token in sessionStorage — lives until browser tab closes
//         // sessionStorage.setItem("gh_token", data.token);
//         // window.history.replaceState({}, "", "/");
//         // window.location.replace("/");
//         console.log("Exchange response:", data);
//         sessionStorage.setItem("gh_token", data.token);
//         // Small delay to ensure sessionStorage write commits before reload
//         setTimeout(() => {
//           window.history.replaceState({}, "", "/");
//           window.location.replace("/");
//         }, 100);
//       })
//       .catch(() => setStatus("error"));
//   }, []);

//   if (status === "error") {
//     return (
//       <div style={{ minHeight: "100vh", background: "#080d1a", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
//         <div style={{ textAlign: "center" }}>
//           <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
//           <div style={{ fontSize: 16, marginBottom: 8 }}>Login failed</div>
//           <a href="/" style={{ color: "#6366f1", fontSize: 13 }}>Try again →</a>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ minHeight: "100vh", background: "#080d1a", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
//       <div style={{ textAlign: "center" }}>
//         <div style={{ fontSize: 13, color: "#64748b" }}>Finishing login…</div>
//       </div>
//     </div>
//   );
// }

// function App() {
//   const isDemo = new URLSearchParams(window.location.search).get("demo") === "true";
//   const [authed, setAuthed] = useState<boolean | null>(null);

//   useEffect(() => {
//     if (isDemo) { setAuthed(false); return; }

//     const token = sessionStorage.getItem("gh_token");
//     if (!token) { setAuthed(false); return; }

//     // Verify token is still valid
//     fetch(`${BASE_URL}/auth/github/me/session`, {
//       headers: { "X-Auth-Token": token },
//     })
//       .then(r => setAuthed(r.ok))
//       .catch(() => setAuthed(false));
//   }, []);

//   if (authed === null && !isDemo) return null;

//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/callback" element={<OAuthCallback />} />
//         <Route path="/" element={(authed || isDemo) ? <Dashboard /> : <ConnectGithub />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//         <Route path="/connect" element={<ConnectGithub />} />
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;
// // function OAuthCallback() {
// //   const [status, setStatus] = useState<"loading" | "error">("loading");

// //   useEffect(() => {
// //     const code = new URLSearchParams(window.location.search).get("code");

// //     if (!code) {
// //       setStatus("error");
// //       return;
// //     }

// //     fetch(`${BASE_URL}/auth/github/exchange`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       credentials: "include", // needed so the browser stores the cookie
// //       body: JSON.stringify({ code }),
// //     })
// //       .then((res) => {
// //         if (!res.ok) throw new Error("Exchange failed");

// //         // Strip the code from the URL then go to the dashboard
// //         window.history.replaceState({}, "", "/");
// //         window.location.replace("/");
// //       })
// //       .catch(() => setStatus("error"));
// //   }, []);

// //   if (status === "error") {
// //     return (
// //       <div
// //         style={{
// //           minHeight: "100vh",
// //           background: "#080d1a",
// //           color: "#e2e8f0",
// //           display: "flex",
// //           alignItems: "center",
// //           justifyContent: "center",
// //           fontFamily: "Inter, sans-serif",
// //         }}
// //       >
// //         <div style={{ textAlign: "center" }}>
// //           <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
// //           <div style={{ fontSize: 16, marginBottom: 8 }}>Login failed</div>
// //           <a href="/" style={{ color: "#6366f1", fontSize: 13 }}>
// //             Try again →
// //           </a>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div
// //       style={{
// //         minHeight: "100vh",
// //         background: "#080d1a",
// //         color: "#e2e8f0",
// //         display: "flex",
// //         alignItems: "center",
// //         justifyContent: "center",
// //         fontFamily: "Inter, sans-serif",
// //       }}
// //     >
// //       <div style={{ textAlign: "center" }}>
// //         <div style={{ fontSize: 13, color: "#64748b" }}>
// //           Finishing login…
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // // ─── App ──────────────────────────────────────────────────────────────────────
// // function App() {
// //   const isDemo =
// //     new URLSearchParams(window.location.search).get("demo") === "true";

// //   // We no longer check localStorage — authentication is managed by the httpOnly
// //   // cookie. Ask the backend if there's a live session instead.
// //   const [authed, setAuthed] = useState<boolean | null>(null);

// //   useEffect(() => {
// //     if (isDemo) {
// //       setAuthed(false);
// //       return;
// //     }

// //     // demo skips auth check
// //     fetch(`${BASE_URL}/auth/github/me/session`, {
// //       credentials: "include",
// //     })
// //       .then((r) => setAuthed(r.ok))
// //       .catch(() => setAuthed(false));
// //   }, []);

// //   // Still checking
// //   if (authed === null && !isDemo) return null;

// //   return (
// //     <BrowserRouter>
// //       <Routes>
// //         <Route path="/callback" element={<OAuthCallback />} />

// //         <Route
// //           path="/"
// //           element={
// //             authed || isDemo ? (
// //               <Dashboard />
// //             ) : (
// //               <ConnectGithub />
// //             )
// //           }
// //         />

// //         <Route path="/dashboard" element={<Dashboard />} />
// //         <Route path="/connect" element={<ConnectGithub />} />
// //         <Route path="*" element={<Navigate to="/" replace />} />
// //       </Routes>
// //     </BrowserRouter>
// //   );
// // }

// // export default App;
