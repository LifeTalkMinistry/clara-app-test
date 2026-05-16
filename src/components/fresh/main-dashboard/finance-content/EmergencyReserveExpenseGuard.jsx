import { ShieldAlert } from "lucide-react";
import { getWalletDisplayBalance, getWalletDisplayName } from "@/utils/dashboard/dashboardHelpers";

const EMERGENCY_RESERVE_WALLET_ID = "clara-emergency-reserve-wallet";

function isEmergencyReserveWallet(wallet) {
  return Boolean(
    wallet &&
      (String(wallet.id) === EMERGENCY_RESERVE_WALLET_ID ||
        wallet.protected_reserve === true ||
        wallet.isEmergencyReserveWallet === true ||
        wallet.type === "protected_reserve" ||
        wallet.wallet_type === "protected_reserve")
  );
}

export default function EmergencyReserveExpenseGuard({
  financeModal,
  financeForm,
  setFinanceForm,
  wallets = [],
  fmt = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`,
}) {
  if (financeModal?.type !== "manual_expense") return null;

  const selectedWallet = (Array.isArray(wallets) ? wallets : []).find(
    (wallet) => String(wallet?.id) === String(financeForm?.expenseWalletId)
  );

  if (!isEmergencyReserveWallet(selectedWallet)) return null;

  const amount = Number(financeForm?.amount || 0);
  const reserveBalance = getWalletDisplayBalance(selectedWallet);
  const nextReserve = Math.max(reserveBalance - (Number.isFinite(amount) ? amount : 0), 0);
  const acknowledged = financeForm?.emergencyReserveAcknowledged === true;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[520] mx-auto w-full max-w-[430px] px-4 text-white">
      <div className="pointer-events-auto overflow-hidden rounded-[28px] border border-amber-200/22 bg-[linear-gradient(135deg,rgba(55,30,8,.94),rgba(15,23,42,.94)_45%,rgba(49,18,80,.94))] p-4 shadow-[0_24px_80px_rgba(0,0,0,.42),0_0_38px_rgba(251,191,36,.10)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-100/18 bg-amber-300/12 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,.14)]">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/60">
              Protected money warning
            </p>
            <h3 className="mt-1 text-[15px] font-black leading-tight text-white">
              You are about to use emergency reserve.
            </h3>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-white/70">
              {getWalletDisplayName(selectedWallet)} is meant for real emergencies. This spend would reduce your safety buffer from {fmt(reserveBalance)} to {fmt(nextReserve)}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setFinanceForm?.((prev) => ({
              ...prev,
              emergencyReserveAcknowledged: !acknowledged,
              emergencyReserveWarningShown: true,
            }))
          }
          className={`mt-4 w-full rounded-[20px] border px-4 py-3 text-[12px] font-black transition active:scale-[0.99] ${
            acknowledged
              ? "border-emerald-200/28 bg-emerald-300/14 text-emerald-50"
              : "border-white/12 bg-white/[0.06] text-white/72"
          }`}
        >
          {acknowledged
            ? "Confirmed — this is a real emergency"
            : "I understand this reduces my protection"}
        </button>
      </div>
    </div>
  );
}
