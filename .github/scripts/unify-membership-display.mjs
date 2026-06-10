import fs from "node:fs";

const targetPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
let source = fs.readFileSync(targetPath, "utf8");

const replaceOnce = (label, before, after) => {
  const matches = source.split(before).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches}`);
  }
  source = source.replace(before, after);
};

replaceOnce(
  "billing-date source guard",
  "const shouldShowBillingDates = membershipState.isActiveCommitted && !membershipState.isDeveloperPreview && hasBillingDates;",
  "const shouldShowBillingDates = membershipState.isActiveCommitted && hasBillingDates;"
);

const oldBillingMessage = `const billingDetailsMessage =
  membershipState.membershipStatus === "loading"
    ? "Syncing membership…"
    : membershipState.isDeveloperPreview
      ? "Developer preview does not create billing dates or modify your real membership."
      : membershipState.isActiveCommitted
        ? billingLoading || !hasBillingDates
          ? "Billing details are syncing."
          : ""
      : membershipState.isPendingActivation
        ? billingLoading
          ? "Activation details are syncing."
          : "Activation is awaiting confirmation."
        : "No active billing. You will only be charged after starting and activating your commitment.";`;

const newBillingMessage = `const billingDetailsMessage =
  membershipState.membershipStatus === "loading"
    ? "Syncing membership…"
    : membershipState.isActiveCommitted
      ? billingLoading
        ? "Billing details are syncing."
        : ""
      : membershipState.isPendingActivation
        ? "Activation is awaiting confirmation."
        : "No active billing. You will only be charged after starting and activating your commitment.";`;

replaceOnce("billing message decision tree", oldBillingMessage, newBillingMessage);

const oldHeader = `      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/65">
          Current membership
        </p>
        {membershipState.isDeveloperPreview ? (
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
            Developer Preview
          </span>
        ) : null}
      </div>`;

const newHeader = `      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/65">
        Current membership
      </p>`;

replaceOnce("developer preview badge", oldHeader, newHeader);

if (source.includes("membershipState.isDeveloperPreview")) {
  throw new Error("Customer-facing Settings code still branches on isDeveloperPreview");
}

if (/Developer Preview|developer preview/i.test(source)) {
  throw new Error("Customer-facing Settings code still contains developer preview wording");
}

fs.writeFileSync(targetPath, source);
console.log(`Updated ${targetPath}`);
