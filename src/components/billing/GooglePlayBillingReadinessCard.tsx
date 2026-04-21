import React, { useCallback, useEffect, useState } from "react";

type BillingProbeState = "idle" | "checking" | "ready" | "diagnostic" | "error";

const PRODUCT_IDS = [
  "pro_99",
  "core_599",
  "coaching_1299",
];

const billingBridge = {
  getPlugin() {
    return (
      (window as any)?.Capacitor?.Plugins?.ClaraBilling ||
      (window as any)?.ClaraBilling
    );
  },

  async connect() {
    try {
      const plugin = this.getPlugin();

      if (!plugin || !plugin.connect) {
        return {
          ok: false,
          message: "❌ ClaraBilling plugin NOT FOUND",
        };
      }

      const res = await plugin.connect();

      return {
        ok: res?.ok === true,
        message: res?.debugMessage || "Connected",
        raw: res,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || "connect() failed",
      };
    }
  },

  async queryProducts(productIds: string[]) {
    try {
      const plugin = this.getPlugin();

      if (!plugin || !plugin.queryProducts) {
        return {
          ok: false,
          message: "❌ queryProducts NOT AVAILABLE",
          found: [],
          missing: productIds,
        };
      }

      const res = await plugin.queryProducts({ productIds });

      const found = res?.foundProductIds || [];
      const missing =
        productIds.filter((id) => !found.includes(id)) || [];

      return {
        ok: res?.ok === true && missing.length === 0,
        message: res?.debugMessage || "",
        found,
        missing,
        raw: res,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || "queryProducts() failed",
        found: [],
        missing: productIds,
      };
    }
  },
};

export default function GooglePlayBillingReadinessCard() {
  const [state, setState] = useState<BillingProbeState>("idle");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const runCheck = useCallback(async () => {
    setState("checking");
    setLogs([]);

    addLog("🔍 Starting Billing Check...");

    // STEP 1: CONNECT
    const connect = await billingBridge.connect();

    if (!connect.ok) {
      setState("diagnostic");
      addLog("❌ CONNECT FAILED");
      addLog(connect.message);
      return;
    }

    addLog("✅ Connected to Billing");

    // STEP 2: QUERY PRODUCTS
    const products = await billingBridge.queryProducts(PRODUCT_IDS);

    if (!products.ok) {
      setState("diagnostic");

      addLog("❌ PRODUCTS ISSUE");

      if (products.missing?.length) {
        addLog("Missing Products:");
        products.missing.forEach((p) => addLog(" - " + p));
      }

      if (products.found?.length) {
        addLog("Found Products:");
        products.found.forEach((p) => addLog(" + " + p));
      }

      addLog(products.message || "Unknown issue");

      return;
    }

    // SUCCESS
    setState("ready");
    addLog("🎉 BILLING READY");
    addLog("All products found:");
    PRODUCT_IDS.forEach((p) => addLog(" + " + p));
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 12,
        background: "#071018",
        color: "white",
        fontFamily: "monospace",
      }}
    >
      <h2 style={{ marginBottom: 10 }}>Billing Status</h2>

      <div style={{ marginBottom: 10 }}>
        {state === "checking" && "⏳ Checking..."}
        {state === "ready" && "✅ READY"}
        {state === "diagnostic" && "⚠️ NOT READY"}
        {state === "error" && "❌ ERROR"}
      </div>

      <div
        style={{
          fontSize: 12,
          background: "#020617",
          padding: 10,
          borderRadius: 8,
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>

      <button
        onClick={runCheck}
        style={{
          marginTop: 10,
          padding: "8px 12px",
          borderRadius: 8,
          background: "#15803D",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Re-check Billing
      </button>
    </div>
  );
}
