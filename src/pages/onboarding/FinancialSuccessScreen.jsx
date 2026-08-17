import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleDot, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
} from "@/lib/incomeHubRepository";

const FRAMEWORK = [
  { label: "Recognize", icon: CircleDot },
  { label: "Protect", icon: ShieldCheck },
  { label: "Direct", icon: ArrowRight },
  { label: "Grow", icon: TrendingUp },
];

function toPositiveNumber(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function firstPositive(...values) {
  for (const value of values) {
    const number = toPositiveNumber(value);
    if (number > 0) return number;
  }
  return 0;
}

function knownMonthlyIncomeFromProfile(profile, user) {
  return firstPositive(
    profile?.monthlyIncome,
    profile?.monthly_income,
    profile?.expectedMonthlyIncome,
    profile?.expected_monthly_income,
    user?.user_metadata?.monthlyIncome,
    user?.user_metadata?.monthly_income,
    user?.user_metadata?.expectedMonthlyIncome,
    user?.user_metadata?.expected_monthly_income,
  );
}

function monthlyIncomeFromSource(source = {}) {
  const explicitMonthlyAmount = firstPositive(
    source.expectedMonthlyIncome,
    source.expected_monthly_income,
    source.monthlyAmount,
    source.monthly_amount,
  );
  if (explicitMonthlyAmount > 0) return explicitMonthlyAmount;

  const expectedPaydayAmount = firstPositive(
    source.minimumStableIncome,
    source.minimum_stable_income,
    source.minimumExpectedIncome,
    source.minimum_expected_income,
    source.expectedAmount,
    source.expected_amount,
  );
  if (expectedPaydayAmount <= 0) return 0;

  const recurrence =
    source.incomeRecurrence ||
    source.income_recurrence ||
    source.recurrenceRule ||
    source.recurrence_rule ||
    {};
  const type = String(
    recurrence.type || recurrence.recurrence || recurrence.frequency || "",
  )
    .trim()
    .toLowerCase();

  if (type === "monthly") return expectedPaydayAmount;
  if (type === "twice_monthly") return expectedPaydayAmount * 2;
  if (type === "weekly") return expectedPaydayAmount * (52 / 12);
  if (type === "biweekly") return expectedPaydayAmount * (26 / 12);

  // Custom schedules do not have a safe monthly interpretation without
  // counting their actual dates, so CLARA keeps the message non-personalized.
  return 0;
}

function formatMonthlyIncome(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinancialSuccessScreen({ user, profile }) {
  const profileMonthlyIncome = useMemo(
    () => knownMonthlyIncomeFromProfile(profile, user),
    [profile, user],
  );
  const [knownMonthlyIncome, setKnownMonthlyIncome] = useState(profileMonthlyIncome);

  useEffect(() => {
    let cancelled = false;
    const localUserId = getIncomeHubLocalUserId(user);

    const readKnownIncome = async () => {
      if (profileMonthlyIncome > 0) {
        if (!cancelled) setKnownMonthlyIncome(profileMonthlyIncome);
        return;
      }

      try {
        const sources = await getIncomeSources(localUserId);
        const monthlyTotal = (Array.isArray(sources) ? sources : [])
          .filter(
            (source) =>
              !source?.isArchived &&
              !source?.is_archived &&
              !source?.deletedAt &&
              !source?.deleted_at,
          )
          .reduce((sum, source) => sum + monthlyIncomeFromSource(source), 0);

        if (!cancelled) setKnownMonthlyIncome(monthlyTotal > 0 ? monthlyTotal : 0);
      } catch {
        if (!cancelled) setKnownMonthlyIncome(0);
      }
    };

    void readKnownIncome();

    const handleIncomeUpdate = () => void readKnownIncome();
    if (typeof window !== "undefined") {
      window.addEventListener("clara-income-hub-updated", handleIncomeUpdate);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("clara-income-hub-updated", handleIncomeUpdate);
      }
    };
  }, [profileMonthlyIncome, user]);

  const hasKnownMonthlyIncome = knownMonthlyIncome > 0;

  return (
    <div className="clara-onboarding-screen clara-financial-success-screen">
      <style>{`
        .clara-financial-success-screen {
          justify-content: center;
        }

        .clara-financial-success-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(250, 204, 21, .76);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .clara-financial-success-kicker svg {
          width: 13px;
          height: 13px;
        }

        .clara-financial-success-title {
          max-width: 390px;
          margin-top: 18px;
          color: #f8fbff;
          font-size: clamp(2rem, 8.7vw, 2.7rem);
          font-weight: 950;
          line-height: .98;
          letter-spacing: -.045em;
          text-wrap: balance;
        }

        .clara-financial-success-copy {
          max-width: 372px;
          margin-top: 18px;
          color: rgba(214, 226, 244, .72);
          font-size: 14px;
          font-weight: 620;
          line-height: 1.65;
          text-wrap: balance;
        }

        .clara-financial-success-copy strong {
          color: rgba(241, 247, 255, .92);
          font-weight: 780;
        }

        .clara-financial-success-framework {
          width: min(100%, 390px);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-top: 24px;
        }

        .clara-financial-success-step {
          min-width: 0;
          display: grid;
          justify-items: center;
          gap: 7px;
          padding: 11px 5px 10px;
          border: 1px solid rgba(96, 165, 250, .15);
          border-radius: 15px;
          background: linear-gradient(180deg, rgba(25, 49, 88, .34), rgba(8, 20, 43, .46));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .028);
        }

        .clara-financial-success-step svg {
          width: 15px;
          height: 15px;
          color: rgba(117, 169, 255, .86);
        }

        .clara-financial-success-step:nth-child(2) svg {
          color: rgba(250, 204, 21, .86);
        }

        .clara-financial-success-step:nth-child(4) svg {
          color: rgba(248, 113, 113, .82);
        }

        .clara-financial-success-step span {
          overflow: hidden;
          color: rgba(235, 243, 255, .78);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: -.01em;
          text-overflow: ellipsis;
        }

        .clara-financial-success-closing {
          max-width: 365px;
          margin-top: 23px;
          padding-top: 18px;
          border-top: 1px solid rgba(121, 170, 255, .16);
          color: rgba(225, 235, 249, .68);
          font-size: 12px;
          font-weight: 650;
          line-height: 1.55;
          text-wrap: balance;
        }

        .clara-financial-success-closing strong {
          display: block;
          margin-bottom: 3px;
          color: #f6f9ff;
          font-size: 14px;
          font-weight: 860;
        }

        @media (max-height: 720px) {
          .clara-financial-success-title { margin-top: 13px; }
          .clara-financial-success-copy { margin-top: 13px; line-height: 1.52; }
          .clara-financial-success-framework { margin-top: 17px; }
          .clara-financial-success-closing { margin-top: 16px; padding-top: 14px; }
        }
      `}</style>

      <span className="clara-financial-success-kicker">
        <Sparkles strokeWidth={1.8} /> A <ClaraBrandName /> belief
      </span>

      <h1 className="clara-financial-success-title">
        {hasKnownMonthlyIncome
          ? `${formatMonthlyIncome(knownMonthlyIncome)} is worth protecting.`
          : "What you have already matters."}
      </h1>

      {hasKnownMonthlyIncome ? (
        <p className="clara-financial-success-copy">
          Your financial success doesn&apos;t begin when you reach somebody else&apos;s income. <strong>What you&apos;re earning today already deserves intention and direction.</strong>
        </p>
      ) : (
        <p className="clara-financial-success-copy">
          Your financial success doesn&apos;t begin when you reach someone else&apos;s salary, lifestyle, or net worth. <strong>It begins when you recognize what you have, protect it, and use it intentionally.</strong>
        </p>
      )}

      <div className="clara-financial-success-framework" aria-label="Recognize, Protect, Direct, Grow">
        {FRAMEWORK.map(({ label, icon: Icon }) => (
          <div key={label} className="clara-financial-success-step">
            <Icon strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="clara-financial-success-closing">
        <strong>You&apos;re not starting from nothing.</strong>
        You&apos;re starting from what you&apos;ve already worked for.
      </p>
    </div>
  );
}
