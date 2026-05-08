import { useEffect, useState } from "react";

export default function useDashboardShellReady(delayMs = 80) {
  const [dashboardShellReady, setDashboardShellReady] = useState(false);

  useEffect(() => {
    let timerId = null;
    let frameId = null;

    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      frameId = window.requestAnimationFrame(() => {
        timerId = window.setTimeout(() => setDashboardShellReady(true), delayMs);
      });
    } else {
      timerId = setTimeout(() => setDashboardShellReady(true), delayMs);
    }

    return () => {
      if (frameId && typeof window !== "undefined") window.cancelAnimationFrame(frameId);
      if (timerId) clearTimeout(timerId);
    };
  }, [delayMs]);

  return dashboardShellReady;
}
