import { fmt } from '@/components/financial-carousel/cards/wallet/logic/walletFormatting';

const shortenWalletName = (value = '') => {
  const clean = String(value || '').trim();

  if (!clean) return 'None';
  if (clean.length <= 10) return clean;

  const words = clean.split(' ');

  if (words.length > 1) {
    const compact = `${words[0]} ${words[1][0] || ''}.`;
    if (compact.length <= 10) return compact;
  }

  return `${clean.slice(0, 8)}…`;
};

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
      value: shortenWalletName(topWallet?.name || 'None'),
      valueClassName: 'text-cyan-50 text-[12px] tracking-[-0.02em]',
    },
    {
      label: 'Recent',
      value: activityCount,
    },
  ];

  return (
    <div className='flex flex-col gap-3'>
      <div>
        <p className={`text-[32px] font-black leading-none tracking-[-0.05em] ${status.text} drop-shadow-[0_0_14px_rgba(110,231,255,0.12)]`}>
          {fmt(walletMoney)}
        </p>

        <p className='mt-2 text-sm font-semibold leading-tight text-white/76'>
          Available across all wallets.
        </p>
      </div>

      <div className='overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm'>
        <div className='grid grid-cols-3 divide-x divide-white/[0.055]'>
          {summaryTiles.map((tile) => (
            <div key={tile.label} className='relative px-2.5 py-2.5 text-center'>
              <div className='pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent' />

              <p
                className={`flex min-h-[1rem] items-center justify-center truncate text-[13px] font-black leading-none tracking-[-0.03em] ${
                  tile.valueClassName || 'text-white/88'
                }`}
              >
                {tile.value}
              </p>

              <p className='mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34'>
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
