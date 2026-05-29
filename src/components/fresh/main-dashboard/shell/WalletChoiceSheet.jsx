import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import { getWalletDisplayName } from "@/utils/dashboard/dashboardHelpers";

export default function WalletChoiceSheet({
  open,
  sourceWallet,
  wallets = [],
  selectedWalletId = "",
  value = 0,
  fmt,
  loading,
  onClose,
  onConfirm,
  onChoose,
}) {
  const formatValue = typeof fmt === "function" ? fmt : (nextValue) => `₱${Number(nextValue || 0).toLocaleString("en-PH")}`;

  return (
    <FinanceActionModal
      open={open}
      title="Choose wallet"
      description={`From: ${getWalletDisplayName(sourceWallet)}`}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm?.();
      }}
      submitLabel={`Continue ${formatValue(value)}`}
      submitDisabled={!wallets.length || value <= 0}
      loading={loading}
    >
      <div className="space-y-4">
        <FinanceField label="Destination wallet">
          <select
            value={selectedWalletId}
            onChange={(event) => onChoose?.(event.target.value)}
            className={financeInputClassName}
          >
            {wallets.map((wallet) => (
              <option key={wallet.id} value={String(wallet.id)}>
                {getWalletDisplayName(wallet)}
              </option>
            ))}
          </select>
        </FinanceField>

        <div className="rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.08] p-4">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-cyan-100/70">
            Fixed value
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">
            {formatValue(value)}
          </p>
        </div>
      </div>
    </FinanceActionModal>
  );
}
