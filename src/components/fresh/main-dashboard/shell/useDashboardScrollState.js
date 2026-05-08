import { useEffect, useRef, useState } from "react";

export default function useDashboardScrollState() {
  const dashboardScrollRef = useRef(null);
  const dashboardContentRef = useRef(null);
  const dashboardScrollTimersRef = useRef([]);
  const [isDashboardScrollable, setIsDashboardScrollable] = useState(false);

  useEffect(() => {
    return () => {
      dashboardScrollTimersRef.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
      dashboardScrollTimersRef.current = [];
    };
  }, []);

  return {
    dashboardScrollRef,
    dashboardContentRef,
    dashboardScrollTimersRef,
    isDashboardScrollable,
    setIsDashboardScrollable,
  };
}
