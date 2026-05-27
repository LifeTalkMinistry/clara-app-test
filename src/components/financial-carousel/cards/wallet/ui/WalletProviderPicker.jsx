import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  getWalletProvider,
  WALLET_PROVIDER_GROUPS,
} from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";

function ProviderIcon({ provider, size = "md" }) {
  const compact = size === "sm";
  const hero = size === "hero";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-white/12 font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${
        hero
          ? "h-16 w-16 text-[14px]"
          : compact
            ? "h-9 w-9 text-[10px]"
            : "h-11 w-11 text-[11px]"
      }`}
      style={{
        background: provider.iconBg,
        color: provider.iconTextColor,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 0 ${
          hero ? 30 : 18
        }px ${provider.accent}33`,
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
    <div className={compact ? "space-y-4" : "space-y-3"}>
      <div
        className="relative overflow-hidden rounded-[28px] border border-emerald-300/35 bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(15,23,42,0.30)_44%,rgba(49,46,129,0.18))] p-4 shadow-[0_0_34px_rgba(45,212,191,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]"
        style={{
          boxShadow: `0 0 34px ${selectedProvider.accent}1f, inset 0 1px 0 rgba(255,255,255,0.10)`,
        }}
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-emerald-300/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-2 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <ProviderIcon provider={selectedProvider} size="hero" />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/90">
              Selected
            </p>

            <p className="mt-1 truncate text-2xl font-black tracking-[-0.035em] text-white">
              {selectedProvider.label}
            </p>

            <p className="mt-0.5 truncate text-[13px] font-semibold text-cyan-50/58">
              {selectedGroupLabel}
            </p>
          </div>

          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.42)]"
            aria-hidden="true"
          >
            <Check className="h-5 w-5 stroke-[3]" />
          </span>
        </div>
      </div>

      <div
        className={`${
          compact ? "max-h-[min(48svh,430px)]" : "max-h-[420px]"
        } space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {WALLET_PROVIDER_GROUPS.map((group) => {
          const isOpen = openGroupKey === group.key;
          const groupHasSelection = selectedGroupKey === group.key;

          return (
            <div
              key={group.key}
              className={`overflow-hidden rounded-[24px] border backdrop-blur-xl transition ${
                groupHasSelection
                  ? "border-emerald-300/28 bg-white/[0.045] shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
                  : "border-white/[0.075] bg-white/[0.028]"
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setOpenGroupKey((current) => (current === group.key ? "" : group.key))
                }
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3.5 text-left transition hover:bg-white/[0.04] disabled:opacity-50"
                aria-expanded={isOpen}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-black uppercase tracking-[0.15em] text-white/88">
                      {group.label}
                    </p>

                    {groupHasSelection ? (
                      <span className="rounded-full border border-emerald-200/25 bg-emerald-300/16 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-200">
                        selected
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 truncate text-[11px] font-semibold leading-4 text-white/46">
                    {group.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="min-w-9 rounded-full border border-white/14 bg-white/[0.045] px-2.5 py-1 text-center text-[11px] font-bold text-white/68">
                    {group.providers.length}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 text-white/58 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isOpen ? (
                <div className="grid grid-cols-2 gap-2.5 border-t border-white/[0.055] bg-black/[0.10] p-3">
                  {group.providers.map((provider) => {
                    const active = selectedProvider.key === provider.key;

                    return (
                      <button
                        key={provider.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect?.(provider)}
                        className={`group relative min-h-[64px] rounded-[22px] border p-3 text-left transition active:scale-[0.985] disabled:opacity-50 ${
                          active
                            ? "border-emerald-300/55 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,23,42,0.22))] shadow-[0_0_26px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(255,255,255,0.09)]"
                            : "border-white/[0.075] bg-white/[0.035] hover:border-white/14 hover:bg-white/[0.055]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon provider={provider} size="sm" />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white/90">
                              {provider.label}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] font-semibold capitalize text-white/38">
                              {provider.walletType.replaceAll("_", " ")}
                            </p>
                          </div>

                          {active ? (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.34)]">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span
                              className="h-6 w-6 shrink-0 rounded-full border border-white/18 bg-white/[0.025]"
                              aria-hidden="true"
                            />
                          )}
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
