import {
  getIncomeSources,
  normalizeIncomeSource,
  deleteIncomeSource,
} from "@/lib/incomeHubRepository";
import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "@/lib/localFinanceStore";
import { normalizeFinancialDateKey } from "@/lib/clara-financial-day";

const STORE_NAME = LOCAL_FINANCE_STORES.privatePreferences;
const INCOME_SOURCE_KIND = "income_source";

const clean = (value) => String(value ?? "").trim();

export function isIncomeSourceMasterPayCycle(source = {}) {
  return Boolean(
    source?.isMasterPayCycle === true ||
      source?.is_master_pay_cycle === true ||
      source?.masterPayCycle === true ||
      source?.master_pay_cycle === true ||
      source?.isMaster === true ||
      source?.is_master === true
  );
}

export function getIncomeSourceMasterCycleConfig(source = {}) {
  const config =
    source?.customMasterPayCycle ||
    source?.custom_master_pay_cycle ||
    source?.masterPayCycleConfig ||
    source?.master_pay_cycle_config ||
    {};
  const start = normalizeFinancialDateKey(
    source?.customCycleStart ||
      source?.custom_cycle_start ||
      source?.masterCycleStart ||
      source?.master_cycle_start ||
      config?.start ||
      config?.cycleStart ||
      config?.cycle_start
  );
  const end = normalizeFinancialDateKey(
    source?.customCycleEnd ||
      source?.custom_cycle_end ||
      source?.masterCycleEnd ||
      source?.master_cycle_end ||
      config?.end ||
      config?.cycleEnd ||
      config?.cycle_end
  );
  const mode = clean(
    source?.masterCycleMode ||
      source?.master_cycle_mode ||
      (start && end ? "custom" : "income_schedule")
  ).toLowerCase();

  return {
    mode: mode === "custom" ? "custom" : "income_schedule",
    start: start || "",
    end: end || "",
  };
}

function emitMasterPayCycleUpdated(sourceId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("clara-master-pay-cycle-updated", {
      detail: { sourceId: sourceId || null },
    })
  );
  window.dispatchEvent(new Event("clara-income-hub-updated"));
  window.dispatchEvent(new Event("clara-finance-updated"));
}

function isActiveIncomeSource(record = {}) {
  return Boolean(
    !record?.deletedAt &&
      !record?.deleted_at &&
      !record?.isArchived &&
      !record?.is_archived &&
      (record?.kind === INCOME_SOURCE_KIND || record?.recordType === INCOME_SOURCE_KIND)
  );
}

function validateCustomCycle(startValue, endValue) {
  const start = normalizeFinancialDateKey(startValue);
  const end = normalizeFinancialDateKey(endValue);
  if (!start || !end) {
    const error = new Error("Choose both a start date and end date for the custom Master Pay Cycle.");
    error.code = "MASTER_PAY_CYCLE_CUSTOM_DATES_REQUIRED";
    throw error;
  }
  if (start >= end) {
    const error = new Error("The custom Master Pay Cycle end date must be after the start date.");
    error.code = "MASTER_PAY_CYCLE_CUSTOM_RANGE_INVALID";
    throw error;
  }
  return { start, end };
}

export async function setIncomeSourceAsMasterPayCycle(
  localUserId,
  sourceId,
  { mode = "income_schedule", customCycleStart = "", customCycleEnd = "" } = {}
) {
  const targetId = clean(sourceId);
  if (!targetId) throw new Error("Choose an income source for the Master Pay Cycle.");

  const normalizedMode = clean(mode).toLowerCase() === "custom" ? "custom" : "income_schedule";
  const customRange = normalizedMode === "custom"
    ? validateCustomCycle(customCycleStart, customCycleEnd)
    : null;

  const savedTarget = await runLocalFinanceTransaction(
    [STORE_NAME],
    localUserId,
    async (tx) => {
      const records = await tx.getAllForUser(STORE_NAME);
      const sources = records.filter(isActiveIncomeSource);
      const target = sources.find((source) => String(source.id) === targetId);
      if (!target) {
        const error = new Error("The selected Master Pay Cycle income source was not found.");
        error.code = "MASTER_PAY_CYCLE_SOURCE_NOT_FOUND";
        throw error;
      }

      let updatedTarget = null;
      for (const source of sources) {
        const selected = String(source.id) === targetId;
        const next = normalizeIncomeSource({
          ...source,
          isMasterPayCycle: selected,
          is_master_pay_cycle: selected,
          masterPayCycle: selected,
          master_pay_cycle: selected,
          isMaster: selected,
          is_master: selected,
          masterCycleMode: selected ? normalizedMode : source?.masterCycleMode,
          master_cycle_mode: selected ? normalizedMode : source?.master_cycle_mode,
          customMasterPayCycle: selected && customRange
            ? { start: customRange.start, end: customRange.end }
            : selected
              ? null
              : source?.customMasterPayCycle,
          custom_master_pay_cycle: selected && customRange
            ? { start: customRange.start, end: customRange.end }
            : selected
              ? null
              : source?.custom_master_pay_cycle,
          customCycleStart: selected && customRange ? customRange.start : selected ? null : source?.customCycleStart,
          custom_cycle_start: selected && customRange ? customRange.start : selected ? null : source?.custom_cycle_start,
          customCycleEnd: selected && customRange ? customRange.end : selected ? null : source?.customCycleEnd,
          custom_cycle_end: selected && customRange ? customRange.end : selected ? null : source?.custom_cycle_end,
        });
        const saved = await tx.put(STORE_NAME, next, source);
        if (selected) updatedTarget = saved;
      }

      return updatedTarget;
    }
  );

  emitMasterPayCycleUpdated(targetId);
  return savedTarget;
}

export async function getMasterPayCycleSource(localUserId) {
  const sources = await getIncomeSources(localUserId);
  return sources.find(isIncomeSourceMasterPayCycle) || null;
}

export async function deleteIncomeSourceWithMasterGuard(
  localUserId,
  sourceId,
  { replacementMasterId = "" } = {}
) {
  const sources = await getIncomeSources(localUserId);
  const source = sources.find((item) => String(item.id) === String(sourceId));
  if (!source) throw new Error("Income source not found for this local user.");

  if (isIncomeSourceMasterPayCycle(source)) {
    const replacementId = clean(replacementMasterId);
    const replacement = sources.find(
      (item) => String(item.id) === replacementId && String(item.id) !== String(source.id)
    );
    if (!replacement) {
      const error = new Error(
        sources.length > 1
          ? "Select another existing income source as Master Pay Cycle before deleting this one."
          : "Create another income source and make it the Master Pay Cycle before deleting this one."
      );
      error.code = "MASTER_PAY_CYCLE_REPLACEMENT_REQUIRED";
      error.availableReplacementSources = sources.filter(
        (item) => String(item.id) !== String(source.id)
      );
      throw error;
    }

    const currentConfig = getIncomeSourceMasterCycleConfig(replacement);
    await setIncomeSourceAsMasterPayCycle(localUserId, replacement.id, {
      mode: currentConfig.mode,
      customCycleStart: currentConfig.start,
      customCycleEnd: currentConfig.end,
    });
  }

  return deleteIncomeSource(localUserId, sourceId);
}
