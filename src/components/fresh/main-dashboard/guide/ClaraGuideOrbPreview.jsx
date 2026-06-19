import ClaraGuideManualExpensePreview from "@/components/fresh/main-dashboard/guide/ClaraGuideManualExpensePreview";
import ClaraGuideTransactionHubPreview from "@/components/fresh/main-dashboard/guide/ClaraGuideTransactionHubPreview";
import ClaraGuideClaraAiPreview from "@/components/fresh/main-dashboard/guide/ClaraGuideClaraAiPreview";

export default function ClaraGuideOrbPreview({ preview, onNext }) {
  if (preview === "log-expense") {
    return <ClaraGuideManualExpensePreview onNext={onNext} />;
  }

  if (preview === "transaction-hub") {
    return <ClaraGuideTransactionHubPreview onNext={onNext} />;
  }

  if (preview === "clara-chat") {
    return <ClaraGuideClaraAiPreview onNext={onNext} />;
  }

  return null;
}
