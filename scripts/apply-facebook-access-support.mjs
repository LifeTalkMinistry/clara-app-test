import fs from "node:fs";

const targetPath =
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx";
let source = fs.readFileSync(targetPath, "utf8");

const replaceOnce = (before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  source = source.replace(before, after);
};

if (source.includes("Message us on the CLARA Facebook page.")) {
  console.log("Facebook access support is already applied.");
} else {
  replaceOnce(
    'import { CalendarDays, Lock, RefreshCcw, X } from "lucide-react";',
    'import { CalendarDays, ExternalLink, Lock, MessageCircle, X } from "lucide-react";',
    "icon import"
  );

  replaceOnce(
    'import useUserRole from "@/hooks/useUserRole";\n',
    "",
    "remove membership refresh hook import"
  );

  replaceOnce(
    '  const [refreshing, setRefreshing] = useState(false);\n  const [refreshMessage, setRefreshMessage] = useState("");\n',
    "",
    "remove refresh state"
  );

  replaceOnce(
    '  const carouselRef = useRef(null);\n  const { refreshUser } = useUserRole();',
    '  const carouselRef = useRef(null);',
    "remove refresh hook usage"
  );

  replaceOnce(
    '    setMembershipInfoOpen(false);\n    setRefreshing(false);\n    setRefreshMessage("");\n',
    '    setMembershipInfoOpen(false);\n',
    "remove refresh reset"
  );

  const refreshHandler = `  const handleRefreshMembership = async () => {\n    if (refreshing) return;\n\n    setRefreshing(true);\n    setRefreshMessage("Checking your CLARA account...");\n\n    try {\n      await refreshUser?.({ reason: "manual_membership_refresh" });\n      setRefreshMessage(\n        "Membership refreshed. Active Committed access will unlock automatically."\n      );\n    } catch (error) {\n      console.error("[CLARA Membership] manual refresh failed", error);\n      setRefreshMessage(\n        "CLARA could not refresh your account. Check your connection and try again."\n      );\n    } finally {\n      setRefreshing(false);\n    }\n  };\n\n`;
  replaceOnce(refreshHandler, "", "remove refresh handler");

  replaceOnce(
    '  const handleScheduleSession = () => {\n    if (refreshing) return;\n    setRefreshMessage("");\n    setMembershipInfoOpen(false);\n    onScheduleSession?.();\n  };',
    '  const handleScheduleSession = () => {\n    setMembershipInfoOpen(false);\n    onScheduleSession?.();\n  };',
    "simplify schedule handler"
  );

  replaceOnce(
    '  const handleDeclineCommitment = () => {\n    if (refreshing) return;\n    setRefreshMessage("");\n    setMembershipInfoOpen(false);\n    onDeclineCommitment?.();\n  };',
    '  const handleDeclineCommitment = () => {\n    setMembershipInfoOpen(false);\n    onDeclineCommitment?.();\n  };',
    "simplify decline handler"
  );

  replaceOnce(
    '                  setRefreshMessage("");\n                  setMembershipInfoOpen(true);',
    '                  setMembershipInfoOpen(true);',
    "remove final-page refresh reset"
  );

  replaceOnce(
    '            onClick={() => {\n              if (!refreshing) setMembershipInfoOpen(false);\n            }}',
    '            onClick={() => setMembershipInfoOpen(false)}',
    "simplify overlay close"
  );

  replaceOnce(
    '                onClick={() => {\n                  if (!refreshing) setMembershipInfoOpen(false);\n                }}\n                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-[15px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] text-white/76 shadow-[0_10px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/[0.17] hover:text-white active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"\n                aria-label="Close membership information"\n                disabled={refreshing}',
    '                onClick={() => setMembershipInfoOpen(false)}\n                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-[15px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] text-white/76 shadow-[0_10px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/[0.17] hover:text-white active:translate-y-0"\n                aria-label="Close membership information"',
    "simplify inner close"
  );

  const refreshMessageBlock = `              {refreshMessage ? (\n                <p className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-white/62">\n                  {refreshMessage}\n                </p>\n              ) : null}\n\n`;
  replaceOnce(refreshMessageBlock, "", "remove refresh message");

  replaceOnce(
    '                  disabled={refreshing}\n                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.92),rgba(99,102,241,0.96))] px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,99,235,0.26),inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"',
    '                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.92),rgba(99,102,241,0.96))] px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,99,235,0.26),inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]"',
    "remove schedule refresh dependency"
  );

  const oldSupport = `                <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/[0.09] bg-white/[0.045] px-3.5 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">\n                  <div className="min-w-0">\n                    <p className="text-[11px] font-black text-white/78">\n                      Already enrolled?\n                    </p>\n                    <p className="mt-0.5 text-[10px] font-semibold leading-4 text-white/42">\n                      Check your latest access.\n                    </p>\n                  </div>\n                  <button\n                    type="button"\n                    onClick={handleRefreshMembership}\n                    disabled={refreshing}\n                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-cyan-100/14 bg-cyan-100/[0.08] px-3 text-[10px] font-black text-cyan-50/76 transition hover:bg-cyan-100/[0.13] hover:text-cyan-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"\n                  >\n                    <RefreshCcw\n                      className={\`h-3.5 w-3.5 \${refreshing ? "animate-spin" : ""}\`}\n                    />\n                    {refreshing ? "Checking" : "Refresh"}\n                  </button>\n                </div>`;

  const newSupport = `                <div className="rounded-[18px] border border-white/[0.09] bg-white/[0.045] px-3.5 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">\n                  <div className="flex items-start gap-3">\n                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-cyan-100/14 bg-cyan-100/[0.08] text-cyan-50/78">\n                      <MessageCircle className="h-4 w-4" />\n                    </span>\n                    <div className="min-w-0">\n                      <p className="text-[11px] font-black text-white/82">\n                        Concerned about your access?\n                      </p>\n                      <p className="mt-0.5 text-[10px] font-semibold leading-4 text-white/46">\n                        Message us on the CLARA Facebook page.\n                      </p>\n                    </div>\n                  </div>\n                  <a\n                    href="https://www.facebook.com/profile.php?id=61590352695488&sk=followers"\n                    target="_blank"\n                    rel="noopener noreferrer"\n                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-cyan-100/14 bg-cyan-100/[0.08] px-4 text-[11px] font-black text-cyan-50/82 transition hover:bg-cyan-100/[0.14] hover:text-cyan-50 active:scale-[0.99]"\n                  >\n                    Message CLARA\n                    <ExternalLink className="h-3.5 w-3.5" />\n                  </a>\n                </div>`;
  replaceOnce(oldSupport, newSupport, "replace refresh support with Facebook support");

  replaceOnce(
    '                  disabled={refreshing}\n                  className="mx-auto block rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/38 transition hover:bg-white/[0.045] hover:text-white/62 disabled:cursor-not-allowed disabled:opacity-50"',
    '                  className="mx-auto block rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/38 transition hover:bg-white/[0.045] hover:text-white/62"',
    "remove decline refresh dependency"
  );

  fs.writeFileSync(targetPath, source);
}

const testPath = "tests/committed-facebook-support.test.mjs";
const testSource = `import assert from "node:assert/strict";\nimport fs from "node:fs";\nimport test from "node:test";\n\nconst source = fs.readFileSync(\n  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx",\n  "utf8"\n);\n\ntest("Committed access support routes users to the CLARA Facebook page", () => {\n  assert.match(source, /Concerned about your access\?/);\n  assert.match(source, /Message us on the CLARA Facebook page\./);\n  assert.match(source, /Message CLARA/);\n  assert.match(\n    source,\n    /https:\\/\\/www\\.facebook\\.com\\/profile\\.php\\?id=61590352695488&sk=followers/\n  );\n});\n\ntest("the old manual membership refresh control is removed from the modal", () => {\n  assert.doesNotMatch(source, /handleRefreshMembership/);\n  assert.doesNotMatch(source, /RefreshCcw/);\n  assert.doesNotMatch(source, /Already enrolled\?/);\n});\n`;
fs.writeFileSync(testPath, testSource);
