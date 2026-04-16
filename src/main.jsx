import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import App from "./App.jsx";
import "./index.css";

const queryClient = new QueryClient();

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/";
    const serviceWorkerPath = `${base.endsWith("/") ? base : `${base}/`}clara-task-reminder-sw.js`;

    navigator.serviceWorker.register(serviceWorkerPath).catch((error) => {
      console.error("Task reminder service worker registration failed:", error);
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));

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
