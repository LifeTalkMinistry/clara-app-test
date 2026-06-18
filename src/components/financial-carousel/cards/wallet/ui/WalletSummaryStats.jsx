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

const getPrimaryWalletName = (topWallet) => {
  if (!topWallet) return 'None';

  return shortenWalletName(
    topWallet?.name ||
      topWallet?.wallet_name ||
      topWallet?.label ||
      'None'
  );
};

export default function WalletSummaryStats({
  walletMoney = 0,
  walletCount = 0,
  topWallet,
  status,
}) {
  const summaryTiles = [
    {
      label: 'Wallets',
      value: walletCount,
    },
    {
      label: 'Primary',
      value: getPrimaryWalletName(topWallet),
      valueClassName: 'text-cyan-50 text-[12px] tracking-[-0.02em]',
    },
  ];

  return (
    <div className='flex flex-col gap-3.5'>
      <div>
        <p className={`text-[clamp(1.95rem,8vw,2.25rem)] font-black leading-none tracking-[-0.055em] ${status.text} drop-shadow-[0_10px_26px_rgba(0,0,0,0.22)]`}>
          {fmt(walletMoney)}
        </p>

        <p className='mt-2.5 max-w-[92%] text-[13px] font-semibold leading-snug text-white/72'>
          Available across all wallets.
        </p>
      </div>

      <div className='overflow-hidden rounded-[24px] border border-cyan-100/[0.10] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_14px_28px_rgba(0,0,0,0.16),0_0_24px_rgba(103,232,249,0.035)] backdrop-blur-xl'>
        <div className='grid grid-cols-2 divide-x divide-white/[0.07]'>
          {summaryTiles.map((tile) => (
            <div key={tile.label} className='relative min-w-0 px-2.5 py-3 text-center'>
              <div className='pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent' />

              <p
                className={`flex min-h-[1rem] items-center justify-center truncate text-[13px] font-black leading-none tracking-[-0.025em] ${
                  tile.valueClassName || 'text-white/90'
                }`}
              >
                {tile.value}
              </p>

              <p className='mt-1.5 truncate text-[8px] font-black uppercase tracking-[0.16em] text-white/40'>
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}