import React from "react";
import { formatIncomeTimingLabel } from "@/lib/recurringCashFlowRepository";
import { IncomeSourcePreviewRow as BaseIncomeSourcePreviewRow } from "./IncomeHubExpandedSurfaces.jsx";

export * from "./IncomeHubExpandedSurfaces.jsx";

export function IncomeSourcePreviewRow(props) {
  const timingLabel = formatIncomeTimingLabel(props.source);

  return React.createElement(
    "div",
    { className: "relative" },
    React.createElement(BaseIncomeSourcePreviewRow, props),
    timingLabel
      ? React.createElement(
          "p",
          {
            className:
              "pointer-events-none absolute left-[75px] right-12 top-[76px] truncate text-[9px] font-semibold leading-none text-cyan-100/56",
          },
          `Usually received: ${timingLabel}`
        )
      : null
  );
}
