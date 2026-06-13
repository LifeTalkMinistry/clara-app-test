import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
  toIncomeHubNumber,
} from "@/lib/incomeHubRepository";
import { formatMoneyWithVisibility } from "@/utils/moneyVisibilityPreference";

const formatPhpAmount = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatIncomeSourceCount = (count) => `${count} source${count === 1 ? "" : "s"}`;

const createIncomeSourceCountValue = (count) => ({
  __incomeHubSourceCountValue: true,
  sourceCount: Number(count) || 0,
  valueOf() {
    return this.sourceCount;
  },
  toString() {
    return formatIncomeSourceCount(this.sourceCount);
  },
});

const isIncomeSourceCountValue = (value) =>
  Boolean(value && typeof value === "object" && value.__incomeHubSourceCountValue);

export const fmt = (value) => {
  if (isIncomeSourceCountValue(value)) {
    return formatIncomeSourceCount(value.sourceCount);
  }

  return formatMoneyWithVisibility(value, formatPhpAmount);
};

export const toNumber = (value) => toIncomeHubNumber(value);

export const clampProgress = (value) => Math.max(0, Math.min(Number(value) || 0, 100));
