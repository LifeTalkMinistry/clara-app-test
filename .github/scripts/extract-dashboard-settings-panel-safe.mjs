import fs from "node:fs";

const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
let source = fs.readFileSync(targetPath, "utf8");
const original = source;

const replaceOnce = (text, search, replacement, label) => {
  const firstIndex = text.indexOf(search);

  if (firstIndex === -1) {
    throw new Error(`Security cleanup anchor not found: ${label}`);
  }

  if (text.indexOf(search, firstIndex + search.length) !== -1) {
    throw new Error(`Security cleanup anchor is not unique: ${label}`);
  }

  return text.slice(0, firstIndex) + replacement + text.slice(firstIndex + search.length);
};

source = replaceOnce(
  source,
  "  ChevronRight,\n  Clock,\n  Edit,",
  "  ChevronRight,\n  Edit,",
  "Clock import"
);

source = replaceOnce(
  source,
  "  Trash2,\n  Wallet,\n  WalletCards,",
  "  Trash2,\n  WalletCards,",
  "Wallet import"
);

const stateAnchor = `  const [billingRecord, setBillingRecord] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);`;

const stateReplacement = `${stateAnchor}
  const [isAiPrivacyModalOpen, setIsAiPrivacyModalOpen] = useState(false);
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [isDataDetailsOpen, setIsDataDetailsOpen] = useState(false);`;

source = replaceOnce(source, stateAnchor, stateReplacement, "Security modal state");

const securityStart = source.indexOf("  const renderSecurityPage = () => {");
const securityEnd = source.indexOf("  const renderSupportPage = () => (", securityStart);

if (securityStart === -1 || securityEnd === -1 || securityEnd <= securityStart) {
  throw new Error("Unable to isolate the Security & Privacy page render block.");
}

const securityReplacement = String.raw`  const renderSecurityPage = () => {
    const protectedDataItems = [
      "Wallets",
      "Expenses",
      "Budgets",
      "Savings",
      "Emergency fund",
      "Transfers",
      "Transaction history",
      "AI context",
    ];
    const aiPrivacyItems = [
      "CLARA checks available device data first.",
      "Only the context needed for guidance is used.",
      "Your decision history stays personal.",
      "Your spending activity is not published to a public feed.",
    ];
    const resetIncludes = [
      "Theme selection",
      "Dashboard preferences",
      "AI visual preferences",
      "Tutorial state",
    ];
    const resetDoesNotDelete = [
      "Wallet balances",
      "Expenses",
      "Budgets",
      "Savings data",
      "Emergency fund",
      "Transfers",
      "Transaction history",
      "AI financial context",
    ];

    const closeSecurityOverlays = () => {
      setIsAiPrivacyModalOpen(false);
      setIsResetConfirmationOpen(false);
    };

    return (
      <div className="space-y-4 pb-6">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              closeSecurityOverlays();
              setIsDataDetailsOpen(false);
              setActiveSetting(null);
              setActiveAboutInfo(null);
              setSettingsNotice(null);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/12"
          >
            <ArrowDown className="h-3.5 w-3.5 rotate-90" />
            Settings
          </button>

          <div className="px-1">
            <h2 className="text-xl font-black tracking-tight text-white">Security & privacy</h2>
            <p className="mt-1.5 max-w-[34ch] text-xs leading-5 text-white/50">
              Manage how CLARA protects and uses your information.
            </p>
          </div>
        </div>

        {renderNotice()}

        <section className="rounded-[24px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),transparent_36%),rgba(255,255,255,0.045)] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-white">Your CLARA data is private</h3>

              {user?.email ? (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">Signed in as</p>
                  <p className="mt-1 break-all text-sm font-semibold leading-5 text-white/78">{user.email}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
                  This device is your private CLARA environment.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {["Financial records protected", "Device-first data", "Not publicly visible"].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-white/72">
                <Check className="h-4 w-4 shrink-0 text-emerald-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-white/48">
            Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain protected.
          </p>

          <button
            type="button"
            onClick={() => setIsDataDetailsOpen((current) => !current)}
            aria-expanded={isDataDetailsOpen}
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-emerald-100 transition hover:text-emerald-50"
          >
            View data details
            <ChevronRight
              className={"h-4 w-4 transition " + (isDataDetailsOpen ? "rotate-90 text-emerald-200" : "")}
            />
          </button>

          {isDataDetailsOpen ? (
            <div className="mt-1 border-t border-white/10 pt-4">
              <ul className="space-y-2">
                {protectedDataItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs font-semibold text-white/58">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-200/80" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => setIsAiPrivacyModalOpen(true)}
          aria-haspopup="dialog"
          className="group flex min-h-[72px] w-full items-center gap-3 rounded-[22px] border border-white/15 bg-white/[0.045] px-4 py-3.5 text-left transition hover:bg-white/[0.07]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/8 text-cyan-100">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">AI privacy</p>
            <p className="mt-1 text-xs leading-5 text-white/46">
              CLARA uses only the financial context needed to guide you.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/45">
            <span className="hidden sm:inline">Learn more</span>
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-white/65" />
          </div>
        </button>

        <section className="rounded-[22px] border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/16 bg-amber-400/8 text-amber-100">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-white">Reset appearance and preferences</h3>
              <p className="mt-1 text-xs leading-5 text-white/46">
                Restore CLARA's default theme and visual preferences.
              </p>
              <p className="mt-2 text-[11px] font-semibold text-emerald-100/75">
                Your financial records will not be deleted.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmationOpen(true)}
            aria-haspopup="dialog"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/18 bg-amber-400/9 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-400/14"
          >
            <RotateCcw className="h-4 w-4" />
            Reset preferences
          </button>
        </section>

        {isAiPrivacyModalOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020713]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsAiPrivacyModalOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-privacy-title"
              onClick={(event) => event.stopPropagation()}
              className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/15 bg-[#081321] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:rounded-[28px]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 id="ai-privacy-title" className="text-lg font-black text-white">
                    How CLARA uses your information
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-white/45">
                    A simple explanation of the context CLARA uses for guidance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiPrivacyModalOpen(false)}
                  aria-label="Close AI privacy information"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.055] text-white/60 transition hover:bg-white/[0.09] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {aiPrivacyItems.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />
                    <p className="text-sm leading-6 text-white/68">{item}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsAiPrivacyModalOpen(false)}
                className="mt-6 min-h-11 w-full rounded-2xl bg-white/[0.09] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.13]"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        {isResetConfirmationOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020713]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsResetConfirmationOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-preferences-title"
              onClick={(event) => event.stopPropagation()}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/15 bg-[#081321] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:rounded-[28px]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 id="reset-preferences-title" className="text-lg font-black text-white">
                    Reset appearance and preferences?
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-white/48">
                    This restores CLARA's default visual setup on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmationOpen(false)}
                  aria-label="Close reset confirmation"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.055] text-white/60 transition hover:bg-white/[0.09] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/70">This will reset</p>
                  <ul className="mt-3 space-y-2.5">
                    {resetIncludes.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-white/65">
                        <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-100/80" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-white/10 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/70">This will not delete</p>
                  <ul className="mt-3 space-y-2.5">
                    {resetDoesNotDelete.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-white/65">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-100" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmationOpen(false)}
                  className="min-h-11 rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.09]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsResetConfirmationOpen(false);
                    await clearLocalPreferences();
                  }}
                  className="min-h-11 rounded-2xl border border-amber-300/20 bg-amber-400/12 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-400/18"
                >
                  Reset preferences
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
`;

source = source.slice(0, securityStart) + securityReplacement + "\n" + source.slice(securityEnd);

const requiredTokens = [
  "Manage how CLARA protects and uses your information.",
  "Your CLARA data is private",
  "How CLARA uses your information",
  "Reset appearance and preferences?",
];

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    throw new Error(`Security cleanup missing required token: ${token}`);
  }
}

const removedTokens = [
  "Future security features",
  "Private AI environment",
  "Protected financial records",
  "Reset preferences and theme",
];

for (const token of removedTokens) {
  if (source.includes(token)) {
    throw new Error(`Security cleanup retained removed UI: ${token}`);
  }
}

if (source === original) {
  throw new Error("Security cleanup produced no source changes.");
}

fs.writeFileSync(targetPath, source);
console.log("Simplified DashboardSettingsPanel Security & Privacy page safely.");
