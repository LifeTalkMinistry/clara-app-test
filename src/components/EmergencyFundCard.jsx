import EmergencyFundCard from "@/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletSynced";
import { EmergencyFundCreateWalletContext } from "@/components/fresh/main-dashboard/carousel/EmergencyFundSetupFlow";

export default function EmergencyFundCardBridge({ onCreateWallet, ...props }) {
  return (
    <EmergencyFundCreateWalletContext.Provider value={onCreateWallet}>
      <EmergencyFundCard {...props} onCreateWallet={onCreateWallet} />
    </EmergencyFundCreateWalletContext.Provider>
  );
}
