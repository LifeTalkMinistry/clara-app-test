import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  getWalletProvider,
  WALLET_PROVIDER_GROUPS,
} from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";

function ProviderIcon({ provider, size = "md" }) {
  const compact = size === "sm";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl border border-white/12 font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${
        compact ? "h-9 w-9 text-[10px]" : "h-11 w-11 text-[11px]"
      }`}
      style={{
        background: provider.iconBg,
        color: provider.iconTextColor,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 0 18px ${provider.accent}33`,
      }}
      aria-hidden="true"
    >
      {provider.iconText}
    </span>
  );
}

export default function WalletProviderPicker({
  selectedProviderKey = "cash",
  onSelect,
  disabled = false,
  compact = false,
}) {
  const selectedProvider = getWalletProvider(selectedProviderKey, selectedProviderKey);
  const selectedGroupKey = selectedProvider.categoryKey || "other_wallets";
  const [openGroupKey, setOpenGroupKey] = useState(selectedGroupKey);

  const selectedGroupLabel = useMemo(() => {
    return (
      WALLET_PROVIDER_GROUPS.find((group) => group.key === selectedGroupKey)?.label ||
      selectedProvider.categoryLabel ||
      "Wallets"
    );
  }, [selectedGroupKey, selectedProvider.categoryLabel]);

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-white/10 bg-black/15 p-3">
        <div className="flex items-center gap-3">
          <ProviderIcon provider={selectedProvider} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/36">
              Selected
            </p>
            <p className="mt-0.5 truncate text-sm font-black text-white/90">
              {selectedProvider.label}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white/44">
              {selectedGroupLabel}
            </p>
          </div>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: selectedProvider.accent, boxShadow: `0 0 18px ${selectedProvider.accent}` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className={`${compact ? "max-h-[310px]" : "max-h-[420px]"} space-y-2 overflow-y-auto pr-1`}>
        {WALLET_PROVIDER_GROUPS.map((group) => {
          const isOpen = openGroupKey === group.key;
          const groupHasSelection = selectedGroupKey === group.key;

          return (
            <div key={group.key} className="rounded-[22px] border border-white/8 bg-white/[0.025] overflow-hidden">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOpenGroupKey((current) => (current === group.key ? "" : group.key))}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-white/[0.04] disabled:opacity-50"
                aria-expanded={isOpen}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
                      {group.label}
                    </p>
                    {groupHasSelection ? (
                      <span className="rounded-full bg-emerald-400 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-slate-950">
                        selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-semibold leading-4 text-white/38">
                    {group.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/42">
                    {group.providers.length}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-white/48 transition ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isOpen ? (
                <div className="grid grid-cols-2 gap-2 border-t border-white/6 p-2.5">
                  {group.providers.map((provider) => {
                    const active = selectedProvider.key === provider.key;

                    return (
                      <button
                        key={provider.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect?.(provider)}
                        className={`group relative min-h-[58px] rounded-[20px] border p-2.5 text-left transition active:scale-[0.985] disabled:opacity-50 ${
                          active
                            ? "border-white/18 bg-white/[0.095] shadow-[0_0_26px_rgba(34,211,238,0.08)]"
                            : "border-white/8 bg-black/[0.12] hover:border-white/14 hover:bg-white/[0.055]"
                        }`}
                        style={active ? { boxShadow: `0 0 24px ${provider.accent}26, inset 0 1px 0 rgba(255,255,255,0.08)` } : undefined}
                      >
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon provider={provider} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-white/88">
                              {provider.label}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] font-semibold text-white/38">
                              {provider.walletType.replaceAll("_", " ")}
                            </p>
                          </div>
                          {active ? (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
