import { createElement } from "react";
import DailyTipCard from "./ui/DailyTipCard";

/**
 * Daily Money Tip is a core habit-building feature for every signed-in CLARA
 * user. Keep its access independent from the Committed-only Learning Hub that
 * surrounds it on the dashboard.
 */
export default function FreeDailyTipCard(props = {}) {
  return createElement(DailyTipCard, {
    ...props,
    hasCommittedAccess: true,
    onOpenCommitmentBooklet: undefined,
  });
}
