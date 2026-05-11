import { fmt } from '@/components/financial-carousel/cards/wallet/logic/walletFormatting';

const glassPanel =
  'border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm';

export default function WalletSummaryStats({
  walletMoney = 0,
  walletCount = 0,
  walletPreviewTransactions = [],
  topWallet,
  status,
}) {
  const activityCount = walletPreviewTransactions.length;

  const summaryTiles = [
    {
      label: 'Wallets',
      value: walletCount,
    },
    {
      label: 'Primary',
      value: topWallet?.name || 'None',
      valueClassName: 'text-white/92 text-[13px]',
    },
    {
      label: 'Recent',
      value: activityCount,
    },
  ];

  return (
    <div className='flex flex-col gap-3'>
      <div>
        <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${status.text}`}>
          {fmt(walletMoney)}
        </p>

        <p className='mt-2 text-sm font-semibold leading-tight text-white/82'>
          Available across all wallets.
        </p>
      </div>

      <div className='grid grid-cols-3 gap-2'>
        {summaryTiles.map((tile) => (
          <div
            key={tile.label}
            className={`rounded-2xl px-2.5 py-2.5 text-center ${glassPanel}`}
          >
            <p
              className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${
                tile.valueClassName || 'text-white/92'
              }`}
            >
              {tile.value}
            </p>

            <p className='mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/42'>
              {tile.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
