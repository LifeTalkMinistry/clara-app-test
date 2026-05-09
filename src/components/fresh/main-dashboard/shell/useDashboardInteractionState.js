import { useState } from "react";

export default function useDashboardInteractionState() {
  const [dailyStrategyFlipped, setDailyStrategyFlipped] = useState(false);
  const [expandedFinanceCard, setExpandedFinanceCard] = useState(null);
  const [expandedFinanceDetailSections, setExpandedFinanceDetailSections] = useState({});
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  return {
    dailyStrategyFlipped,
    setDailyStrategyFlipped,
    expandedFinanceCard,
    setExpandedFinanceCard,
    expandedFinanceDetailSections,
    setExpandedFinanceDetailSections,
    showAiAssistant,
    setShowAiAssistant,
  };
}
