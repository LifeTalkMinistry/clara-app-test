import WalletListItem from '@/components/financial-carousel/cards/wallet/ui/WalletListItem';
import WalletRecentActivity from '@/components/financial-carousel/cards/wallet/ui/WalletRecentActivity';
import WalletEmptyState from '@/components/financial-carousel/cards/wallet/ui/WalletEmptyState';
import WalletHeader from '@/components/financial-carousel/cards/wallet/ui/WalletHeader';
import WalletSummaryStats from '@/components/financial-carousel/cards/wallet/ui/WalletSummaryStats';
import FinanceCardExpandButton from '@/components/financial-carousel/shared/FinanceCardExpandButton';
import FinanceCardExpandedPanel from '@/components/financial-carousel/shared/FinanceCardExpandedPanel';
import WalletCreateButton from '@/components/financial-carousel/cards/wallet/ui/WalletCreateButton';
import { fmt } from '@/components/financial-carousel/cards/wallet/logic/walletFormatting';

function getRegisteredWalletCount(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).filter(
    (wallet) =>
      wallet &&
      !wallet?.is_archived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  ).length;
}

function WalletSkeletonLoader({ expanded = false }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse ${expanded ? 'min-h-[420px]' : 'min-h-[260px]'}`}
    >
      <div className='h-6 w-28 rounded-xl bg-white/10' />
      <div className='mt-5 h-12 w-44 rounded-2xl bg-white/10' />
      <div className='mt-3 h-4 w-52 rounded-lg bg-white/5' />

      <div className='mt-6 space-y-3'>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className='rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='flex-1'>
                <div className='h-4 w-24 rounded-lg bg-white/10' />
                <div className='mt-2 h-3 w-16 rounded-lg bg-white/[0.06]' />
              </div>

              <div className='h-10 w-10 rounded-2xl bg-white/[0.08]' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WalletCardContent({
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  financeDataLoading = false,
  onCreateWallet,
  onMoveWallet,
  onDeleteWallet,
  onAddMoney,
  onTransferMoney,
  topWallet,
  status,
  message,
  expandedMessage,
  visibleWallets = [],
  visibleTransactions = [],
  openEditWallet,
}) {
  const walletCount = getRegisteredWalletCount(wallets);
  const shouldShowSkeleton = financeDataLoading && walletCount <= 0;

  if (!expanded) {
    return (
      <div className='relative z-10 flex h-full min-h-[286px] flex-col overflow-hidden px-4 pb-4 pt-5'>
        <div className='pointer-events-none absolute inset-0 opacity-[0.46]'>
          <div className='absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-cyan-400/[0.06] blur-3xl' />
          <div className='absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-violet-500/[0.10] blur-3xl' />
          <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),transparent_30%,rgba(0,0,0,0.16)_100%)]' />
        </div>

        <div className='relative flex min-h-0 flex-1 flex-col gap-4'>
          {shouldShowSkeleton ? (
            <WalletSkeletonLoader expanded={false} />
          ) : (
            <>
              <div className='min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]'>
                <WalletHeader walletCount={walletCount} />

                <div className='mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3'>
                  <WalletSummaryStats
                    walletMoney={walletMoney}
                    walletCount={walletCount}
                    walletPreviewTransactions={walletPreviewTransactions}
                    topWallet={topWallet}
                    status={status}
                    message={message}
                  />
                </div>
              </div>

              <div className='mt-0.5 shrink-0 border-t border-white/[0.035] pt-3'>
                <FinanceCardExpandButton
                  detailKey='wallets'
                  expanded={expanded}
                  onToggleDetails={onToggleDetails}
                  collapsedLabel='View Wallets'
                  expandedLabel='Hide Wallets'
                  className='border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]'
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='relative z-10 flex h-full min-h-[515px] flex-col overflow-hidden px-4 pb-4 pt-5'>
      <div className='pointer-events-none absolute inset-0 opacity-[0.42]'>
        <div className='absolute -left-24 top-[-70px] h-48 w-48 rounded-full bg-cyan-400/[0.06] blur-3xl' />
        <div className='absolute bottom-[-130px] right-[-110px] h-60 w-60 rounded-full bg-violet-500/[0.10] blur-3xl' />
      </div>

      <div className='relative flex shrink-0 flex-col gap-4'>
        <div className='shrink-0'>
          <p
            className={`text-[clamp(2rem,8vw,2.25rem)] font-black leading-none tracking-[-0.045em] ${status.text}`}
          >
            {fmt(walletMoney)}
          </p>

          <p className='mt-[clamp(0.45rem,1svh,0.65rem)] text-xs font-semibold leading-relaxed text-white/70'>
            Total available across your wallet system.
          </p>
        </div>

        <div className='shrink-0 border-t border-white/[0.035] pt-3'>
          <FinanceCardExpandButton
            detailKey='wallets'
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel='View Wallets'
            expandedLabel='Hide Wallets'
            className='border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]'
          />
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden pt-3'>
        <FinanceCardExpandedPanel className='h-full min-h-[360px] overflow-y-auto pr-1'>
          {shouldShowSkeleton ? (
            <WalletSkeletonLoader expanded />
          ) : (
            <>
              <div className='mb-3 rounded-2xl border border-white/[0.05] bg-black/[0.10] px-3 py-2.5 text-xs font-medium leading-5 text-white/64'>
                {expandedMessage}
              </div>

              {visibleWallets.length ? (
                <div className='space-y-2'>
                  {visibleWallets.map((wallet, index) => (
                    <WalletListItem
                      key={wallet.id || `${wallet.name}-${index}`}
                      wallet={wallet}
                      index={index}
                      financeActionLoading={financeActionLoading}
                      openEditWallet={openEditWallet}
                      onAddMoney={onAddMoney}
                      onTransferMoney={onTransferMoney}
                      onMoveWallet={onMoveWallet}
                      onDeleteWallet={onDeleteWallet}
                    />
                  ))}

                  <WalletRecentActivity transactions={visibleTransactions} />
                </div>
              ) : (
                <WalletEmptyState />
              )}

              <WalletCreateButton onCreateWallet={onCreateWallet} />
            </>
          )}
        </FinanceCardExpandedPanel>
      </div>
    </div>
  );
}
