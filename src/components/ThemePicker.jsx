import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClaraFabLogoInjector from "@/components/ClaraFabLogoInjector";
import { Check, Palette, Sparkles, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTheme } from "@/theme/ThemeProvider";

const DASHBOARD_FINANCE_CARD_TEXTS = [
  "money left",
  "total expense",
  "total expenses",
  "money out",
];

function normalizeClickableText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isDashboardPath() {
  const currentPath = window.location.hash?.replace(/^#/, "") || window.location.pathname;
  return currentPath === "/dashboard" || currentPath.startsWith("/dashboard?");
}

function shouldOpenTransactionsFromDashboardClick(target) {
  if (!isDashboardPath()) return false;
  if (!target || typeof target.closest !== "function") return false;

  const ignoredInteractive = target.closest(
    "a, input, textarea, select, [role='dialog'], [data-no-transaction-nav='true']"
  );

  if (ignoredInteractive) return false;

  const card = target.closest("button, [role='button'], article, section, div");
  if (!card) return false;

  const text = normalizeClickableText(card.innerText || card.textContent || "");
  if (!text) return false;

  return DASHBOARD_FINANCE_CARD_TEXTS.some((label) => text.includes(label));
}

function DashboardFinanceCardClickBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const handlePointerUp = (event) => {
      if (!shouldOpenTransactionsFromDashboardClick(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      navigate("/expenses", {
        state: {
          from: "dashboard",
          source: "finance_card",
        },
      });
    };

    document.addEventListener("pointerup", handlePointerUp, true);

    return () => {
      document.removeEventListener("pointerup", handlePointerUp, true);
    };
  }, [navigate]);

  return null;
}

export default function ThemePicker() {
  const {
    pickerOpen,
    closeThemePicker,
    setPickerOpen,
    themeGroups,
    selectedTheme,
    setTheme,
  } = useTheme();

  const handleThemeSelect = async (themeKey) => {
    await setTheme(themeKey);
    closeThemePicker();
  };

  return (
    <>
      <ClaraFabLogoInjector />
      <DashboardFinanceCardClickBridge />
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[86vh] max-h-[860px] w-full max-w-4xl flex-col rounded-t-[32px] border p-0 sm:bottom-4 sm:h-[78vh] sm:rounded-[32px] [&>button]:hidden"
          style={{
            borderColor: "var(--theme-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--theme-card) 92%, black 8%) 0%, color-mix(in srgb, var(--theme-surface) 94%, black 6%) 100%)",
            boxShadow:
              "0 30px 90px rgba(0,0,0,0.46), 0 0 0 1px color-mix(in srgb, var(--theme-border) 20%, transparent) inset",
            touchAction: "pan-y",
          }}
        >
          <SheetTitle className="sr-only">Pick your CLARA atmosphere</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a dashboard theme. Selecting a theme updates the app and closes
            this panel.
          </SheetDescription>

          <div className="relative overflow-hidden border-b px-5 pb-5 pt-6 sm:px-6">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "var(--theme-gradient-hero)", opacity: 0.28 }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />

            <button
              type="button"
              onClick={closeThemePicker}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border bg-black/20 text-white/75 backdrop-blur-xl transition hover:bg-white/10 hover:text-white active:scale-95"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--theme-border) 40%, transparent)",
              }}
              aria-label="Close theme picker"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative pr-12">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl">
                  <Palette className="h-3.5 w-3.5" />
                  Theme Studio
                </div>

                <h2 className="mt-4 text-2xl font-bold text-white sm:text-[30px]">
                  Pick your CLARA atmosphere
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                  Every theme updates the dashboard, feed, messages, analytics, forms,
                  cards, modals, and navigation instantly.
                </p>
              </div>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-6"
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            <div className="space-y-6">
              {themeGroups.map((group) => (
                <section key={group.key} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">
                        {group.label}
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        {group.items.length} premium theme
                        {group.items.length > 1 ? "s" : ""}
                      </p>
                    </div>

                    {group.key === "default" ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((theme) => {
                      const active = selectedTheme.key === theme.key;

                      return (
                        <button
                          key={theme.key}
                          type="button"
                          onClick={() => handleThemeSelect(theme.key)}
                          className="group overflow-hidden rounded-[26px] border text-left transition duration-200 hover:-translate-y-[1px] active:scale-[0.99]"
                          style={{
                            borderColor: active
                              ? "color-mix(in srgb, var(--theme-accent) 80%, white 20%)"
                              : "color-mix(in srgb, var(--theme-border) 28%, transparent)",
                            background: active
                              ? "color-mix(in srgb, var(--theme-card) 88%, white 12%)"
                              : "color-mix(in srgb, var(--theme-card) 94%, transparent)",
                            boxShadow: active
                              ? "0 20px 48px rgba(0,0,0,0.26), 0 0 0 1px color-mix(in srgb, var(--theme-accent) 18%, transparent) inset"
                              : "0 16px 36px rgba(0,0,0,0.18)",
                          }}
                        >
                          <div
                            className="relative h-28 border-b"
                            style={{
                              background: theme.preview,
                              borderColor:
                                "color-mix(in srgb, var(--theme-border) 20%, transparent)",
                            }}
                          >
                            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_38%,rgba(255,255,255,0.14)_78%,rgba(255,255,255,0)_100%)]" />

                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                              <div className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-xl">
                                {group.label}
                              </div>

                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/0 backdrop-blur-xl transition group-hover:text-white/75"
                                style={{
                                  color: active ? "white" : undefined,
                                  background: active
                                    ? "rgba(255,255,255,0.18)"
                                    : undefined,
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {theme.label}
                                </p>
                                <p className="mt-1 text-xs text-white/55">
                                  {theme.chip}
                                </p>
                              </div>

                              {active ? (
                                <span className="inline-flex shrink-0 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                                  Active
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
