import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import App from "./App.jsx";
import "./index.css";

const queryClient = new QueryClient();

function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-[#061018] text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-red-500/20 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
          Configuration Required
        </div>

        <h1 className="mt-5 text-3xl font-bold">Supabase environment variables are missing</h1>

        <p className="mt-4 text-white/75">
          This build was deployed without the required Supabase settings, so the app cannot
          connect to authentication or data services.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1220] p-5 text-sm text-white/75">
          Add these Vite variables before building the site:
          <div className="mt-3 font-mono text-xs text-emerald-300">
            VITE_SUPABASE_URL
            <br />
            VITE_SUPABASE_ANON_KEY
          </div>
        </div>

        <p className="mt-6 text-sm text-white/55">
          If this site is hosted on GitHub Pages, the production build needs those values available
          during the build step before updating the `docs/` output.
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));

if (!isSupabaseConfigured) {
  root.render(
    <React.StrictMode>
      <MissingConfigScreen />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
