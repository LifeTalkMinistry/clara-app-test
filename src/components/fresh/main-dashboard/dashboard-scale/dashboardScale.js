import { useEffect, useState } from "react";

export const getDashboardViewportMode = () => {
  if (typeof window === "undefined") return "normal";

  const height = window.innerHeight || 844;
  const width = window.innerWidth || 390;

  if (height <= 700 || width <= 360) return "ultraCompact";
  if (height <= 780) return "compact";
  if (height <= 860) return "normal";
  return "spacious";
};

export function useDashboardViewportMode() {
  const [mode, setMode] = useState(getDashboardViewportMode);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frameId = null;
    const updateMode = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setMode(getDashboardViewportMode());
      });
    };

    updateMode();
    window.addEventListener("resize", updateMode, { passive: true });
    window.addEventListener("orientationchange", updateMode, { passive: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateMode);
      window.removeEventListener("orientationchange", updateMode);
    };
  }, []);

  return mode;
}

export const DASHBOARD_SCALE = {
  ultraCompact: {
    page: "min-h-0",
    headerOuter: "px-[clamp(10px,3vw,14px)] pb-1.5 pt-[calc(env(safe-area-inset-top)+8px)] md:px-[clamp(10px,3vw,14px)]",
    headerPanel: "min-h-[74px] rounded-[22px] px-2 py-2 sm:px-2",
    headerItem: "min-h-[58px] gap-1 rounded-[14px] px-1 py-1.5 sm:px-1.5",
    headerIcon: "h-8 w-8",
    headerIconSvg: "h-4 w-4",
    headerLabel: "text-[10px]",
    content: "mt-2 space-y-[clamp(7px,1.5dvh,10px)] px-[clamp(10px,3vw,14px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(10px,3vw,14px)] md:space-y-[clamp(7px,1.5dvh,10px)]",
    financeWrap: "space-y-[clamp(8px,1.4dvh,12px)]",
    financeClip: "rounded-[24px]",
    financeSlide: "min-h-[238px] rounded-[24px] [&>*]:min-h-[236px] [&>*]:rounded-[23px]",
    dots: "gap-1 pt-1 pb-[clamp(6px,1.2dvh,10px)]",
    summaryGrid: "rounded-[22px]",
    summaryCell: "min-h-[104px] p-[clamp(13px,3.4vw,16px)]",
    summaryLabel: "text-[9px] tracking-[0.18em]",
    summaryAmount: "mt-2.5 text-[clamp(30px,8vw,35px)]",
    summaryCopy: "mt-2 text-[11px] leading-4",
    summarySubcopy: "mt-1 text-[10px] leading-4",
  },
  compact: {
    page: "min-h-0",
    headerOuter: "px-[clamp(12px,3.5vw,16px)] pb-1.5 pt-[calc(env(safe-area-inset-top)+10px)] md:px-[clamp(12px,3.5vw,16px)]",
    headerPanel: "min-h-[80px] rounded-[24px] px-2 py-2 sm:px-2",
    headerItem: "min-h-[62px] gap-1 rounded-[15px] px-1 py-1.5 sm:px-1.5",
    headerIcon: "h-9 w-9",
    headerIconSvg: "h-[18px] w-[18px]",
    headerLabel: "text-[10.5px]",
    content: "mt-2 space-y-[clamp(8px,1.7dvh,12px)] px-[clamp(12px,3.5vw,16px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(12px,3.5vw,16px)] md:space-y-[clamp(8px,1.7dvh,12px)]",
    financeWrap: "space-y-[clamp(8px,1.4dvh,12px)]",
    financeClip: "rounded-[26px]",
    financeSlide: "min-h-[258px] rounded-[26px] [&>*]:min-h-[256px] [&>*]:rounded-[25px]",
    dots: "gap-1.5 pt-1 pb-[clamp(7px,1.3dvh,12px)]",
    summaryGrid: "rounded-[24px]",
    summaryCell: "min-h-[106px] p-[clamp(13px,3.5vw,16px)]",
    summaryLabel: "text-[10px] tracking-[0.2em]",
    summaryAmount: "mt-2.5 text-[clamp(31px,8.2vw,36px)]",
    summaryCopy: "mt-2 text-xs leading-5",
    summarySubcopy: "mt-1.5 text-[11px] leading-4",
  },
  normal: {
    page: "min-h-0",
    headerOuter: "px-[clamp(14px,4vw,18px)] pb-2 pt-[calc(env(safe-area-inset-top)+12px)] md:px-[clamp(14px,4vw,18px)]",
    headerPanel: "min-h-[84px] rounded-[24px] px-2 py-2 sm:px-2.5",
    headerItem: "min-h-[66px] gap-1 rounded-[16px] px-1 py-2 sm:px-2",
    headerIcon: "h-10 w-10",
    headerIconSvg: "h-5 w-5",
    headerLabel: "text-[11px]",
    content: "mt-2.5 space-y-[clamp(10px,1.8dvh,14px)] px-[clamp(14px,4vw,18px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(14px,4vw,18px)] md:space-y-[clamp(10px,1.8dvh,14px)]",
    financeWrap: "space-y-[clamp(9px,1.5dvh,14px)]",
    financeClip: "rounded-[28px]",
    financeSlide: "min-h-[286px] rounded-[28px] [&>*]:min-h-[284px] [&>*]:rounded-[27px]",
    dots: "gap-1.5 pt-1.5 pb-[clamp(8px,1.4dvh,14px)]",
    summaryGrid: "rounded-[26px]",
    summaryCell: "min-h-[110px] p-[clamp(14px,3.6vw,17px)]",
    summaryLabel: "text-[11px] tracking-[0.22em]",
    summaryAmount: "mt-2.5 text-[clamp(32px,8.4vw,37px)]",
    summaryCopy: "mt-3 text-sm leading-6",
    summarySubcopy: "mt-2 text-xs leading-5",
  },
  spacious: {
    page: "min-h-0",
    headerOuter: "px-[clamp(16px,4vw,20px)] pb-2 pt-[calc(env(safe-area-inset-top)+14px)] md:px-[clamp(16px,4vw,20px)]",
    headerPanel: "min-h-[86px] rounded-[24px] px-2 py-2.5 sm:px-2.5",
    headerItem: "min-h-[66px] gap-1 rounded-[16px] px-1 py-2 sm:px-2",
    headerIcon: "h-10 w-10",
    headerIconSvg: "h-5 w-5",
    headerLabel: "text-[11px]",
    content: "mt-2.5 space-y-[clamp(12px,2dvh,16px)] px-[clamp(16px,4vw,20px)] pb-[calc(env(safe-area-inset-bottom)+6px)] md:px-[clamp(16px,4vw,20px)] md:space-y-[clamp(12px,2dvh,16px)]",
    financeWrap: "space-y-[clamp(9px,1.5dvh,14px)]",
    financeClip: "rounded-[30px]",
    financeSlide: "min-h-[314px] rounded-[30px] [&>*]:min-h-[312px] [&>*]:rounded-[29px]",
    dots: "gap-1.5 pt-1.5 pb-[clamp(8px,1.4dvh,14px)]",
    summaryGrid: "rounded-[28px]",
    summaryCell: "min-h-[112px] p-[clamp(14px,3.8vw,18px)]",
    summaryLabel: "text-[11px] tracking-[0.22em]",
    summaryAmount: "mt-2.5 text-[clamp(32px,8.4vw,37px)]",
    summaryCopy: "mt-3 text-sm leading-6",
    summarySubcopy: "mt-2 text-xs leading-5",
  },
};
