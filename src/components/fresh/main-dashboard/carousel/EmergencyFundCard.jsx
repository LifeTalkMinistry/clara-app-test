import {
  Shield,
  Edit2,
  Camera,
  X,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
} from "lucide-react";

import SurvivalExpenseModal from "../../../../SurvivalExpenseModal";
import useEmergencyFundCard, {
  clampOpacity,
  fmt,
  VALID_TARGET_MONTHS,
} from "../../../../hooks/useEmergencyFundCard";

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
  theme = null,
  expanded = false,
  onToggleDetails,
  onQuickExpense,
  onQuickAI,
}) {
  const { state, computed, handlers } = useEmergencyFundCard({
    moneyLeft,
    survivalExpense,
    retentionRate,
    onSurvivalSaved,
    canAutoPrompt,
    hasSurvivalSetup,
    theme,
    expanded,
    onQuickExpense,
    onQuickAI,
  });

  const {
    isExpanded,
    editing,
    showModal,
    targetMonths,
    wallpaper,
    showWallpaperModal,
    draftWallpaper,
    draftOpacity,
    showTopUpModal,
    topUpAmount,
    topUpWalletId,
    topUpError,
    saving,
  } = state;

  const {
    safeWallets,
    effectiveExpense,
    safeMoneyLeft,
    target,
    months,
    pct,
    status,
    progression,
    milestone,
    themeClasses,
    resolvedWallpaperOpacity,
  } = computed;

  const {
    setEditing,
    setShowModal,
    setShowWallpaperModal,
    setDraftOpacity,
    setShowTopUpModal,
    setTopUpAmount,
    setTopUpWalletId,
    setTopUpError,
    handleSaved,
    changeTargetMonths,
    handleOrbPointerDown,
    handleOrbPointerUp,
    handleOrbPointerCancel,
    handleOrbClick,
    openWallpaperModal,
    handleWallpaperUpload,
    handleWallpaperSave,
    handleWallpaperRemove,
    openTopUpModal,
    handleTopUpSave,
  } = handlers;

  return (
    <>
      <SurvivalExpenseModal
        open={showModal || editing}
        initialValue={effectiveExpense}
        onSaved={handleSaved}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(false);
            setShowModal(false);
          }
        }}
      />

      {showTopUpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTopUpModal(false)}
          />

          <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className={`text-base font-semibold ${themeClasses.title}`}>
                  Add Emergency Fund
                </p>
                <p className={`mt-0.5 text-xs ${themeClasses.muted}`}>
                  Move money from a wallet into your protection fund
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Source Wallet
                </label>

                <select
                  value={topUpWalletId}
                  onChange={(e) => {
                    setTopUpWalletId(e.target.value);
                    setTopUpError("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-400/40"
                >
                  {safeWallets.map((wallet) => {
                    const id = String(wallet?.id || wallet?.wallet_id || "");
                    const name = wallet?.name || wallet?.title || "Wallet";
                    const balance = Number(
                      wallet?.balance ??
                        wallet?.current_balance ??
                        wallet?.amount ??
                        0
                    );

                    return (
                      <option key={id} value={id} className="bg-slate-950">
                        {name} — {fmt(balance)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  value={topUpAmount}
                  onChange={(e) => {
                    setTopUpAmount(e.target.value);
                    setTopUpError("");
                  }}
                  placeholder="0"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-emerald-400/40"
                />
              </div>

              {topUpError && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200">
                  {topUpError}
                </div>
              )}

              <button
                type="button"
                onClick={handleTopUpSave}
                disabled={saving || safeWallets.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : "Add to Emergency Fund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWallpaperModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWallpaperModal(false)}
          />

          <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className={`text-base font-semibold ${themeClasses.title}`}>
                  Emergency Background
                </p>
                <p className={`mt-0.5 text-xs ${themeClasses.muted}`}>
                  Upload photo and adjust opacity
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div className="relative h-48">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#08111d] via-[#111827] to-[#071520]" />

                  {draftWallpaper ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url("${draftWallpaper}")`,
                        opacity: clampOpacity(draftOpacity),
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.30),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

                  <div className="relative z-10 flex h-full items-end p-4">
                    <div>
                      <p className="text-lg font-bold text-white">
                        Emergency Fund
                      </p>
                      <p className="text-xs text-white/75">
                        Preview of your card background
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10">
                <Upload className="h-4 w-4" />
                <span>{draftWallpaper ? "Change photo" : "Upload photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWallpaperUpload}
                  className="hidden"
                />
              </label>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-white/65">
                    Background Opacity
                  </p>
                  <p className="text-[11px] font-semibold text-white/85">
                    {Math.round((Number(draftOpacity) || 0) * 100)}%
                  </p>
                </div>

                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={draftOpacity}
                  onChange={(e) => setDraftOpacity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleWallpaperRemove}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Remove
                </button>

                <button
                  type="button"
                  onClick={handleWallpaperSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        data-emergency-card="true"
        className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${themeClasses.border} ${status.ring}`}
        style={{ borderColor: themeClasses.outline }}
      >
        <div className="absolute inset-0" style={{ background: themeClasses.background }} />

        {wallpaper ? (
          <div
            className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${wallpaper}")`,
              opacity: resolvedWallpaperOpacity,
            }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.30),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

        <div className="absolute right-4 top-[112px] z-20 sm:right-5 sm:top-[116px]">
          <button
            type="button"
            onPointerDown={handleOrbPointerDown}
            onPointerUp={handleOrbPointerUp}
            onPointerCancel={handleOrbPointerCancel}
            onPointerLeave={handleOrbPointerUp}
            onClick={handleOrbClick}
            className={`relative flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border backdrop-blur-xl transition hover:scale-[1.04] active:scale-95 ${themeClasses.glass}`}
            aria-label="Tap to log expense, double tap to open analytics, long press to open CLARA AI"
            title="Tap: Log expense • Double tap: Analytics • Long press: CLARA AI"
          >
            <span className="absolute inset-[-5px] rounded-full bg-emerald-400/20 blur-md animate-[emergencyOrbPulse_1.8s_ease-in-out_infinite]" />
            <span className="absolute inset-0 rounded-full bg-white/10 animate-[emergencyOrbBeat_1.8s_ease-in-out_infinite]" />
            <Sparkles className="relative z-10 h-4 w-4" />
          </button>
        </div>

        <style>{`
          @keyframes emergencyOrbPulse {
            0%, 100% { opacity: 0.35; transform: scale(0.96); }
            50% { opacity: 0.78; transform: scale(1.12); }
          }
          @keyframes emergencyOrbBeat {
            0%, 100% { opacity: 0.45; transform: scale(0.98); }
            45% { opacity: 0.95; transform: scale(1.04); }
          }
        `}</style>

        <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
          <div className="flex min-h-0 flex-1 flex-col justify-between">
            <div className="mb-3 flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${themeClasses.iconShell}`}>
                <Shield className={`h-4 w-4 ${themeClasses.iconColor}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-base font-semibold tracking-tight ${themeClasses.title}`}>
                      Emergency Fund
                    </p>
                    <p className={`mt-0.5 text-[11px] font-medium ${themeClasses.body}`}>
                      Protection based on your monthly survival expense
                    </p>
                  </div>

                  <div className="flex shrink-0 items-start">
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3 pr-14">
              {safeMoneyLeft <= 0 ? (
                <p className={`text-2xl font-bold ${themeClasses.title}`}>Start your fund</p>
              ) : (
                <p className={`text-[32px] font-bold leading-none ${status.text}`}>
                  {months.toFixed(1)}
                  <span className="ml-1.5 text-base font-semibold text-white/85">months</span>
                </p>
              )}

              <p className={`mt-2 max-w-[28rem] text-xs font-medium leading-relaxed ${themeClasses.body}`}>{progression}</p>
              <p className={`text-[11px] mt-1 ${themeClasses.muted}`}>Your future stability depends on this.</p>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
                <span>Protection progress</span>
                <span>{pct.toFixed(0)}%</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
                <div className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`} style={{ width: `${pct}%` }}>
                  <div className="absolute inset-0 bg-white/20 opacity-40" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                <span>{fmt(safeMoneyLeft)}</span>
                <span>{fmt(target)}</span>
              </div>
            </div>

            <button type="button" onClick={onToggleDetails} className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-sm transition hover:bg-white/10 ${themeClasses.glass}`}>
              <span className="font-medium">{isExpanded ? "Hide details" : "Show details"}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {isExpanded && (
            <div className={`mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] ${themeClasses.glass} [&::-webkit-scrollbar]:hidden`}>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">Goal</span>
                  <span className="text-[11px] font-semibold text-white/70">{milestone?.label}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {VALID_TARGET_MONTHS.map((m) => {
                    const active = targetMonths === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => changeTargetMonths(m)}
                        disabled={saving}
                        className={`relative rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${active ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.25)]" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"}`}
                      >
                        <span className="block">{m} Months</span>
                        {active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Monthly</p>
                  <p className="text-sm font-bold text-white">{fmt(effectiveExpense)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Available</p>
                  <p className="text-sm font-bold text-white">{fmt(safeMoneyLeft)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Target</p>
                  <p className="text-sm font-bold text-white">{fmt(target)}</p>
                </div>
              </div>

              {retentionRate != null && (
                <div className="flex items-center justify-between text-xs font-medium text-white/75">
                  <span>Retention Rate</span>
                  <span className="text-white/95">{retentionRate}%</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
                  <Edit2 className="h-4 w-4" />
                  Edit Expense
                </button>

                <button type="button" onClick={openWallpaperModal} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
                  <Camera className="h-4 w-4" />
                  Background
                </button>
              </div>

              <button type="button" onClick={openTopUpModal} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15">
                <Plus className="h-4 w-4" />
                Add Fund
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
