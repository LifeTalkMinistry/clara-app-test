import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useFinancialData from "../../hooks/useFinancialData";

export const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n) || 0);

export const MILESTONES = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

export const VALID_TARGET_MONTHS = [3, 6, 12];

const ORB_LONG_PRESS_MS = 520;
const ORB_DOUBLE_TAP_DELAY_MS = 340;
const INCOME_LOOKBACK_DAYS = 90;

const MOTION_TRANSITION_KEY = "clara_motion_transition_origin";
const TRANSACTION_TRANSITION_KEY = "clara_transactions_transition_origin";
const MOTION_TARGET_KEY = "clara_motion_target_path";

const INCOME_TYPES = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);

function normalizeWallet(wallet = {}) {
  const id = String(
    wallet?.id ||
    wallet?.wallet_id ||
    wallet?.walletId ||
    wallet?.uuid ||
    ""
  );

  const balance = Number(
    wallet?.balance ??
    wallet?.current_balance ??
    wallet?.amount ??
    wallet?.wallet_balance ??
    wallet?.money ??
    0
  );

  return {
    ...wallet,
    id,
    wallet_id: id,
    name:
      wallet?.name ||
      wallet?.title ||
      wallet?.wallet_name ||
      wallet?.label ||
      "Wallet",
    balance,
  };
}

export function clampOpacity(value) {
  return Math.max(0, Math.min(Number(value) || 0.3, 0.5));
}
