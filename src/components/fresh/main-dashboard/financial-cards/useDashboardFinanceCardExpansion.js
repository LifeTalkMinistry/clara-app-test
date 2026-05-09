import { useCallback, useEffect } from "react";

export default function useDashboardFinanceCardExpansion({
  activeDashboardPanel,
  expandedFinanceCard,
  setExpandedFinanceCard,
  setExpandedFinanceDetailSections,
  dashboardViewportMode,
  dashboardScrollRef,
  dashboardContentRef,
  dashboardScrollTimersRef,
  setIsDashboardScrollable,
}) {
  const clearDashboardScrollTimers = useCallback(() => {
    dashboardScrollTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    dashboardScrollTimersRef.current = [];
  }, [dashboardScrollTimersRef]);

  const measureDashboardScrollability = useCallback(() => {
    if (activeDashboardPanel !== "home" || !expandedFinanceCard) {
      setIsDashboardScrollable(false);
      return false;
    }

    const scrollNode = dashboardScrollRef.current;
    const contentNode = dashboardContentRef.current;
    if (!scrollNode || !contentNode || typeof window === "undefined") {
      setIsDashboardScrollable(false);
      return false;
    }

    const viewportHeight = Math.max(window.innerHeight || 0, scrollNode.clientHeight || 0);
    const contentHeight = Math.max(
      scrollNode.scrollHeight || 0,
      contentNode.scrollHeight || 0,
      contentNode.getBoundingClientRect?.().height || 0
    );
    const shouldScroll = contentHeight > viewportHeight + 8;

    setIsDashboardScrollable(shouldScroll);
    return shouldScroll;
  }, [
    activeDashboardPanel,
    dashboardContentRef,
    dashboardScrollRef,
    expandedFinanceCard,
    setIsDashboardScrollable,
  ]);

  const scheduleDashboardScrollMeasure = useCallback(() => {
    if (typeof window === "undefined") return;

    clearDashboardScrollTimers();
    window.requestAnimationFrame(() => {
      measureDashboardScrollability();
    });

    [120, 280, 380].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        measureDashboardScrollability();
      }, delay);
      dashboardScrollTimersRef.current.push(timerId);
    });
  }, [
    clearDashboardScrollTimers,
    dashboardScrollTimersRef,
    measureDashboardScrollability,
  ]);

  const toggleFinanceDetails = useCallback((cardKey, options = {}) => {
    const { autoExpand = false, forceOpen = false } = options || {};

    setExpandedFinanceCard((prev) => {
      const next = forceOpen ? cardKey : prev === cardKey ? null : cardKey;

      if (next && autoExpand) {
        setExpandedFinanceDetailSections((current) => ({
          ...current,
          [next]: true,
        }));
      }

      if (!next) {
        setIsDashboardScrollable(false);
        window.requestAnimationFrame(() => {
          dashboardScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
        });
      }

      return next;
    });
  }, [
    dashboardScrollRef,
    setExpandedFinanceCard,
    setExpandedFinanceDetailSections,
    setIsDashboardScrollable,
  ]);

  const toggleExpandedFinanceDetailSection = useCallback((cardKey) => {
    setExpandedFinanceDetailSections((current) => ({
      ...current,
      [cardKey]: current?.[cardKey] === false ? true : false,
    }));
  }, [setExpandedFinanceDetailSections]);

  useEffect(() => {
    scheduleDashboardScrollMeasure();

    if (!expandedFinanceCard) {
      setIsDashboardScrollable(false);
      dashboardScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    }

    return clearDashboardScrollTimers;
  }, [
    activeDashboardPanel,
    clearDashboardScrollTimers,
    dashboardScrollRef,
    dashboardViewportMode,
    expandedFinanceCard,
    scheduleDashboardScrollMeasure,
    setIsDashboardScrollable,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      scheduleDashboardScrollMeasure();
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [scheduleDashboardScrollMeasure]);

  return {
    toggleFinanceDetails,
    toggleExpandedFinanceDetailSection,
  };
}
