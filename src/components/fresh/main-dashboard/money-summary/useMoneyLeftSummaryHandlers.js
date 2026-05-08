import { useCallback, useMemo, useRef } from "react";

export default function useMoneyLeftSummaryHandlers({
  navigate,
  setFinanceModal,
  setShowAiAssistant,
} = {}) {
  const moneyLeftTapRef = useRef({
    lastTapAt: 0,
    lastHandledEventAt: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const moneyLeftNavigateLockRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);


  const isManualExpenseOrbEvent = useCallback((event) => {
    return Boolean(
      event?.target?.closest?.('[data-clara-manual-expense-orb="true"]')
    );
  }, []);

  const stopMoneyLeftSummaryEvent = useCallback((event) => {
    if (isManualExpenseOrbEvent(event)) {
      return false;
    }

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
    return false;
  }, [isManualExpenseOrbEvent]);

  const openTransactionHubFromMoneyLeft = useCallback(
    (event) => {
      if (isManualExpenseOrbEvent(event)) return;

      stopMoneyLeftSummaryEvent(event);

      const now = Date.now();
      if (now - moneyLeftNavigateLockRef.current < 450) return;

      moneyLeftNavigateLockRef.current = now;
      navigate("/transactions-hub");
    },
    [isManualExpenseOrbEvent, navigate, stopMoneyLeftSummaryEvent]
  );

  const handleMoneyLeftPointerDown = useCallback((event) => {
    if (isManualExpenseOrbEvent(event)) return;

    event?.stopPropagation?.();
    const point = event?.touches?.[0] || event;

    moneyLeftTapRef.current = {
      ...moneyLeftTapRef.current,
      startX: Number(point?.clientX || 0),
      startY: Number(point?.clientY || 0),
      moved: false,
    };
  }, [isManualExpenseOrbEvent]);

  const handleMoneyLeftPointerMove = useCallback((event) => {
    const point = event?.touches?.[0] || event;
    const startX = moneyLeftTapRef.current.startX || 0;
    const startY = moneyLeftTapRef.current.startY || 0;
    const dx = Math.abs(Number(point?.clientX || 0) - startX);
    const dy = Math.abs(Number(point?.clientY || 0) - startY);

    if (dx > 12 || dy > 12) {
      moneyLeftTapRef.current.moved = true;
    }
  }, []);

  const handleMoneyLeftTapEnd = useCallback(
    (event) => {
      if (isManualExpenseOrbEvent(event)) return;

      stopMoneyLeftSummaryEvent(event);

      if (moneyLeftTapRef.current.moved) {
        moneyLeftTapRef.current.lastTapAt = 0;
        return;
      }

      const now = Date.now();
      const eventStamp = Number(event?.timeStamp || now);
      const lastHandledEventAt = moneyLeftTapRef.current.lastHandledEventAt || 0;

      if (lastHandledEventAt && Math.abs(eventStamp - lastHandledEventAt) < 120) {
        return;
      }

      moneyLeftTapRef.current.lastHandledEventAt = eventStamp;

      const previousTapAt = moneyLeftTapRef.current.lastTapAt || 0;

      if (previousTapAt && now - previousTapAt <= 320) {
        moneyLeftTapRef.current.lastTapAt = 0;
        openTransactionHubFromMoneyLeft(event);
        return;
      }

      moneyLeftTapRef.current.lastTapAt = now;
    },
    [isManualExpenseOrbEvent, openTransactionHubFromMoneyLeft, stopMoneyLeftSummaryEvent]
  );

  const moneyLeftSummaryHandlers = useMemo(
    () => ({
      onClickCapture: stopMoneyLeftSummaryEvent,
      onClick: stopMoneyLeftSummaryEvent,
      onDoubleClickCapture: openTransactionHubFromMoneyLeft,
      onDoubleClick: openTransactionHubFromMoneyLeft,
      onPointerDownCapture: handleMoneyLeftPointerDown,
      onPointerMoveCapture: handleMoneyLeftPointerMove,
      onPointerUpCapture: handleMoneyLeftTapEnd,
      onTouchStartCapture: handleMoneyLeftPointerDown,
      onTouchMoveCapture: handleMoneyLeftPointerMove,
      onTouchEndCapture: handleMoneyLeftTapEnd,
      onMouseUpCapture: handleMoneyLeftTapEnd,
      onKeyDownCapture: stopMoneyLeftSummaryEvent,
      onKeyDown: stopMoneyLeftSummaryEvent,
    }),
    [
      handleMoneyLeftPointerDown,
      handleMoneyLeftPointerMove,
      handleMoneyLeftTapEnd,
      openTransactionHubFromMoneyLeft,
      stopMoneyLeftSummaryEvent,
    ]
  );

  const markOnboardingCompleted = useCallback(async () => {
    if (!user?.id) return;

    try {
      const updates = {
        program_onboarding_completed: true,
        has_completed_program_onboarding: true,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.warn("Profiles table does not accept onboarding fields yet:", error);
      }
    } catch (error) {
      console.error("Failed to save onboarding completion:", error);
    }
  }, [user?.id]);

  const isProgramOnboardingCompleted = useCallback(() => {
    return hasCompletedProgramOnboarding(profileData);
  }, [profileData]);

  const saveOnboardingDraft = useCallback(async () => {
    if (!user?.id) return true;

    setSavingOnboarding(true);

    try {
      const nextName = normalizeString(nickname);
      persistDashboardPrefs(user.id, {
        reminderTime,
        financialGoal,
      });

      const updates = {
        onboarding_step: onboardingStep,
      };

      if (nextName) {
        updates.full_name = nextName;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.warn("Optional onboarding fields were not saved to DB:", error);
      }

      return true;
    } catch (error) {
      console.error("Failed to save onboarding draft:", error);
      return false;
    } finally {
      setSavingOnboarding(false);
    }
  }, [user?.id, nickname, reminderTime, financialGoal, onboardingStep]);

  const goToNextOnboardingStep = useCallback(async () => {
    await saveOnboardingDraft();
    setOnboardingStep((prev) => prev + 1);
  }, [saveOnboardingDraft]);

  const loadDashboardData = useCallback(
    async ({ background = false } = {}) => {
      const currentUser = { id: userId, email: userEmail, full_name: user?.full_name || "" };

      if (!currentUser.email && !currentUser.id) {
        const emptyCache = createEmptyDashboardCache();
        dashboardPageCache = emptyCache;
        hydrateFromCache(emptyCache);
        return emptyCache;
      }

      const ownerKey = cacheKey || currentUser.id || currentUser.email || "guest";
      if (dashboardPageInFlight?.key === ownerKey) return dashboardPageInFlight.promise;
      if (!hasLoadedDashboardRef.current && !background && !hasDashboardFinanceContent(dashboardPageCache)) {
        setLoading(true);
      }

      try {
        const promise = (async () => {
          const [tasksRes, submissionsRes, userProgramRecord, profilesRes, enrollmentsRes] = await Promise.all([
            supabase.from("challenge_tasks").select("*").order("sort_order", { ascending: true }).order("day", { ascending: true }),
            supabase.from("task_submissions").select("*"),
            fetchUserProgramRecord({ supabase, userId: currentUser.id }),
            supabase.from("profiles").select("*"),
            supabase.from("enrollments").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(1),
          ]);

          if (tasksRes.error) console.error("Failed to load tasks:", tasksRes.error);
          if (submissionsRes.error) console.error("Failed to load submissions:", submissionsRes.error);
          if (profilesRes.error) console.error("Failed to load profiles:", profilesRes.error);
          if (enrollmentsRes.error) console.error("Failed to load enrollments:", enrollmentsRes.error);

          const userSubmissions = (submissionsRes.data || []).filter((item) => isOwnedByUser(item, currentUser));
          const normalizedTasks = (tasksRes.data || []).map(normalizeProgramTask);
          const userProfile = (profilesRes.data || []).find((profile) => isOwnedByUser(profile, currentUser)) || null;
          const enrollmentRecord = (enrollmentsRes.data || [])[0] || null;

          const safeWallets = Array.isArray(financeWallets) ? financeWallets : [];
          const safeWalletTransactions = Array.isArray(financeWalletTransactions) ? financeWalletTransactions : [];
          const safeTransfers = Array.isArray(financeTransfers) ? financeTransfers : [];
          const safeBudgets = Array.isArray(financeBudgets) ? financeBudgets : [];
          const safeSavingsGoals = Array.isArray(financeSavingsGoals) ? financeSavingsGoals : [];
          const safeExpenses = Array.isArray(financeExpenses) ? financeExpenses : [];
          const safePendingExpenses = safeExpenses.filter((item) => item?.pending_sync || item?.sync_status === "pending" || item?.syncStatus === "pending" || item?.local_only);
          const nextWalletMoney = safeWallets.reduce((sum, wallet) => sum + getWalletDisplayBalance(wallet), 0);

          const storedPrefs = readDashboardPrefs(currentUser.id);
          const nextNickname = normalizeString(userProfile?.display_name || userProfile?.nickname || userProfile?.full_name || nickname || dashboardPageCache.nickname || currentUser.full_name || "");
          const nextReminderTime = reminderTime || dashboardPageCache.reminderTime || storedPrefs.reminderTime;
          const nextFinancialGoal = financialGoal || dashboardPageCache.financialGoal || storedPrefs.financialGoal;
          const approved = isProgramApproved(userProfile, isPaid, enrollmentRecord);
          const onboardingDone = hasCompletedProgramOnboarding(userProfile);
          if (!approved || onboardingDone || !dailyRemindersEnabled) setShowProgramStart(false);

          const nextCache = {
            key: ownerKey,
            loaded: true,
            tasks: normalizedTasks,
            submissions: userSubmissions,
            programRecord: userProgramRecord || dashboardPageCache.programRecord || null,
            survivalExpense: firstPositiveNumber(userProfile?.monthly_survival_expense, userProfile?.survival_expense, userProfile?.clara_survival_expense, readStoredSurvivalExpense(currentUser.id), survivalExpense, dashboardPageCache.survivalExpense),
            walletMoney: nextWalletMoney,
            wallets: safeWallets,
            walletTransactions: safeWalletTransactions,
            transfers: safeTransfers,
            budgets: safeBudgets,
            savingsGoals: safeSavingsGoals,
            emergencyFund: financeEmergencyFund || null,
            expenses: safeExpenses,
            pendingExpenses: safePendingExpenses,
            offlineReady: true,
            profileData: userProfile,
            latestEnrollment: enrollmentRecord,
            guardChecked: true,
            nickname: nextNickname,
            reminderTime: nextReminderTime,
            financialGoal: nextFinancialGoal,
          };

          dashboardPageCache = nextCache;
          hydrateFromCache(nextCache);

          if (approved && !nextCache.programRecord && currentUser.id) {
            ensureUserProgramAccess({
              supabase,
              user: currentUser,
              profile: userProfile,
              enrollment: enrollmentRecord,
              tasks: normalizedTasks,
            })
              .then((ensuredRecord) => {
                if (!ensuredRecord) return;
                dashboardPageCache = {
                  ...dashboardPageCache,
                  programRecord: ensuredRecord,
                };
                setProgramRecord(ensuredRecord);
              })
              .catch((ensureError) => {
                console.warn("Program access background refresh failed:", ensureError);
              });
          }

          if (!isClaraOnline() && !hasVisibleFinanceData) {
            setFinanceNotice({
              message: "You’re offline. CLARA is using offline-first finance data.",
              type: "success",
            });
          }
          return nextCache;
        })();

        dashboardPageInFlight = { key: ownerKey, promise };
        return await promise;
      } catch (error) {
        console.warn("Dashboard background refresh warning:", error);
        if (!hasVisibleFinanceData && !hasDashboardFinanceContent(dashboardPageCache)) {
          setFinanceNotice({
            message: "Dashboard data could not fully refresh. Finance data remains protected offline.",
            type: "error",
          });
        }
        return dashboardPageCache;
      } finally {
        if (dashboardPageInFlight?.key === ownerKey) dashboardPageInFlight = null;
        setLoading(false);
        setGuardChecked(true);
      }
    },
    [cacheKey, dailyRemindersEnabled, financeBudgets, financeEmergencyFund, financeExpenses, financeSavingsGoals, financeTransfers, financeWalletTransactions, financeWallets, financialGoal, hasVisibleFinanceData, hydrateFromCache, isPaid, nickname, reminderTime, survivalExpense, user?.full_name, userEmail, userId]
  );  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshFinancialData?.();
      loadDashboardData({ background: true });
    }, 350);
  }, [loadDashboardData, refreshFinancialData]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    latestEnrollmentRef.current = latestEnrollment;
  }, [latestEnrollment]);

  useEffect(() => {
    isPaidRef.current = isPaid;
  }, [isPaid]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOffline = () => {
      setFinanceNotice({
        message: "You’re offline. CLARA is using saved data.",
        type: "success",
      });
    };

    const handleOnline = () => {
      setFinanceNotice({
        message: "You’re back online. CLARA is syncing saved data.",
        type: "success",
      });
      loadDashboardData({ background: true });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const updated = event?.detail?.profile || {};

      setProfileData((prev) => ({
        ...(prev || {}),
        ...updated,
      }));

      const nextName = normalizeString(
        updated?.display_name ||
          updated?.nickname ||
          updated?.full_name ||
          ""
      );

      if (nextName) {
        setNickname(nextName);
      }

      scheduleRefresh();
    };

    window.addEventListener("clara-profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("clara-profile-updated", handleProfileUpdated);
    };
  }, [scheduleRefresh]);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    window.addEventListener("clara-expenses-updated", scheduleRefresh);
    window.addEventListener("clara-finance-updated", scheduleRefresh);
    window.addEventListener("clara-wallets-updated", scheduleRefresh);
    window.addEventListener("clara-wallet-transactions-updated", scheduleRefresh);
    window.addEventListener("clara-budgets-updated", scheduleRefresh);
    window.addEventListener("clara-savings-goals-updated", scheduleRefresh);

    const channel = supabase
      .channel(`dashboard-live-${user?.id || user?.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_goals" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_tasks" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_submissions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async (payload) => {
          scheduleRefresh();

          const newData = payload?.new || {};
          const oldData = payload?.old || {};
          const belongsToUser =
            normalizeString(newData?.id) === normalizeString(user?.id) ||
            normalizeString(newData?.email).toLowerCase() ===
              normalizeString(user?.email).toLowerCase();

          if (!belongsToUser) return;

          const currentEnrollment = latestEnrollmentRef.current;
          const wasApproved = isProgramApproved(oldData, false, currentEnrollment);
          const nowApproved = isProgramApproved(
            newData,
            isPaidRef.current,
            currentEnrollment
          );

          if (!wasApproved && nowApproved && !approvalTriggeredRef.current) {
            approvalTriggeredRef.current = true;

            try {
              const completed = hasCompletedProgramOnboarding(newData);

              if (!completed) {
                setOnboardingStep(Number(newData?.onboarding_step) || 0);
              }
            } catch (error) {
              console.error("Failed handling approval transition:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("clara-expenses-updated", scheduleRefresh);
      window.removeEventListener("clara-finance-updated", scheduleRefresh);
      window.removeEventListener("clara-wallets-updated", scheduleRefresh);
      window.removeEventListener(
        "clara-wallet-transactions-updated",
        scheduleRefresh
      );
      window.removeEventListener("clara-budgets-updated", scheduleRefresh);
      window.removeEventListener("clara-savings-goals-updated", scheduleRefresh);

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, scheduleRefresh]);

  useEffect(() => {
    if (!guardChecked || !profileData) return;

    const shouldRedirect = shouldForceToEnroll(profileData, latestEnrollment, isPaid);

    if (shouldRedirect) {
      navigate("/enroll", { replace: true });
    }
  }, [guardChecked, profileData, latestEnrollment, isPaid, navigate]);

  const thisMonthSpent = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return expenses.reduce((sum, expense) => {
      const expenseDate = getTransactionDate(expense);
      if (!expenseDate) return sum;

      return getPHMonthKey(expenseDate) === currentMonthKey
        ? sum + Number(expense.amount || 0)
        : sum;
    }, 0);
  }, [expenses]);

  const thisMonthIncome = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return walletTransactions.reduce((sum, transaction) => {
      const type = normalizeLower(transaction?.type || transaction?.transaction_type);
      if (!INCOME_TRANSACTION_TYPES.has(type)) return sum;

      const date = getTransactionDate(transaction);
      if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;

      return sum + firstValidNumber(transaction?.amount);
    }, 0);
  }, [walletTransactions]);

  const moneyLeftThisMonth = thisMonthIncome - thisMonthSpent;

  const budgetSummaries = useMemo(() => {
    const monthRange = getPHMonthRange();
    const activeBudgets = budgets.filter((budget) => {
      const month = normalizeString(budget?.month || budget?.budget_month);
      return !month || month === getPHMonthKey();
    });

    return FINANCE_CATEGORIES.map((category) => {
      const allocated = activeBudgets.reduce((sum, budget) => {
        const budgetCategory = getBudgetCategoryKey(budget);
        if (budgetCategory !== category) return sum;
        return sum + getBudgetTotal(budget);
      }, 0);

      const used = expenses.reduce((sum, expense) => {
        if (getExpenseCategoryKey(expense) !== category) return sum;
        if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) {
          return sum;
        }
        return sum + firstValidNumber(expense?.amount);
      }, 0);

      return {
        category,
        allocated,
        used,
        remaining: Math.max(allocated - used, 0),
        pct: allocated > 0 ? Math.min((used / allocated) * 100, 999) : 0,
      };
    })
      .filter((item) => item.allocated > 0 || item.used > 0)
      .sort((a, b) => b.used - a.used || b.allocated - a.allocated)
      .slice(0, 4);
  }, [budgets, expenses]);

  const monthlyBudgetHeader = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return (
      budgets.find((budget) => {
        const month = normalizeString(budget?.month || budget?.budget_month || budget?.month_key);
        const isCurrentMonth = !month || month === currentMonthKey;
        const status = normalizeLower(budget?.status);
        const isActive = budget?.is_active !== false && budget?.active !== false;
        const isHeader =
          budget?.is_plan_header === true ||
          budget?.plan_type === "monthly_budget" ||
          normalizeLower(budget?.category) === "__monthly_budget__" ||
          normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
          normalizeLower(budget?.type) === "monthly_budget";

        return isCurrentMonth && isActive && !["inactive", "archived", "deleted", "closed"].includes(status) && isHeader;
      }) || null
    );
  }, [budgets]);

  const declaredMonthlyBudgetAmount = useMemo(() => {
    return firstValidNumber(
      monthlyBudgetHeader?.declared_amount,
      monthlyBudgetHeader?.declared_budget,
      monthlyBudgetHeader?.monthly_budget_amount,
      monthlyBudgetHeader?.total_declared_budget,
      monthlyBudgetHeader?.total_budget,
      monthlyBudgetHeader?.budget_amount,
      monthlyBudgetHeader?.amount
    );
  }, [monthlyBudgetHeader]);

  const manualExpenseBudgetOptions = useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const seen = new Set();

    return budgets
      .filter((budget) => {
        const month = normalizeString(budget?.month || budget?.budget_month || budget?.month_key);
        const status = normalizeLower(budget?.status);
        const isActive = budget?.is_active !== false && budget?.active !== false;
        const isClosed = ["inactive", "archived", "deleted", "closed"].includes(status);
        const isHeader =
          budget?.is_plan_header === true ||
          budget?.plan_type === "monthly_budget" ||
          normalizeLower(budget?.category) === "__monthly_budget__" ||
          normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
          normalizeLower(budget?.type) === "monthly_budget";

        return !isHeader && isActive && !isClosed && (!month || month === currentMonthKey);
      })
      .map((budget, index) => {
        const title = getBudgetListTitle(budget);
        const keySource =
          budget?.id ||
          budget?.section_key ||
          budget?.category ||
          budget?.budget_category ||
          title;

        return {
          key: String(keySource),
          id: budget?.id || null,
          title,
          needType: getBudgetNeedType(budget),
          allocated: firstValidNumber(
            budget?.allocated_amount,
            budget?.budget_amount,
            budget?.total_budget,
            budget?.amount,
            budget?.budget
          ),
          month: normalizeString(budget?.month || budget?.budget_month || budget?.month_key || currentMonthKey),
          sortOrder: firstValidNumber(
            budget?.sort_order,
            budget?.display_order,
            budget?.position,
            index
          ),
          budget,
        };
      })
      .filter((item) => {
        const signature = normalizeLower(item.title);
        if (!signature || signature === "monthly spending plan" || seen.has(signature)) return false;
        seen.add(signature);
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }, [budgets]);

  const selectedManualExpenseBudget = useMemo(
    () =>
      manualExpenseBudgetOptions.find(
        (item) => String(item.key) === String(financeForm.budgetListKey)
      ) || null,
    [financeForm.budgetListKey, manualExpenseBudgetOptions]
  );

  const selectedBudgetListLabel = useMemo(() => {
    if (financeForm.budgetListKey === "__unplanned__") return "Unplanned Spending";
    if (financeForm.budgetListKey === "__undocumented__") return "Undocumented Spending";
    return selectedManualExpenseBudget?.title || "Select budget list";
  }, [financeForm.budgetListKey, selectedManualExpenseBudget?.title]);

  const setManualExpenseBudgetListKey = useCallback((nextValue) => {
    setFinanceForm((prev) => ({
      ...prev,
      budgetListKey: nextValue,
      unplannedReason:
        nextValue === "__unplanned__" ? prev.unplannedReason : "",
      undocumentedReason:
        nextValue === "__undocumented__" ? prev.undocumentedReason : "",
      undocumentedNote:
        nextValue === "__undocumented__" ? prev.undocumentedNote : "",
      notes:
        nextValue === "__unplanned__" || nextValue === "__undocumented__"
          ? prev.notes
          : "",
    }));
    setBudgetListOpen(false);
  }, []);

  const manualExpenseIsUnplanned = financeForm.budgetListKey === "__unplanned__";
  const manualExpenseIsUndocumented = financeForm.budgetListKey === "__undocumented__";
  const manualExpenseReason = normalizeString(financeForm.unplannedReason || financeForm.notes);
  const manualExpenseUndocumentedReason = normalizeString(financeForm.undocumentedReason);
  const manualExpenseCanSubmit =
    Number(financeForm.amount) > 0 &&
    Boolean(financeForm.budgetListKey) &&
    Boolean(financeForm.expenseWalletId) &&
    (!manualExpenseIsUnplanned || Boolean(manualExpenseReason)) &&
    (!manualExpenseIsUndocumented || Boolean(manualExpenseUndocumentedReason));

  const monthlyBudgetPlan = useMemo(() => {
    const monthKey = getPHMonthKey();
    const monthRange = getPHMonthRange();
    const categoryRows = manualExpenseBudgetOptions.map((item) => {
      const spent = expenses.reduce((sum, expense) => {
        const status = normalizeLower(expense?.planning_status);
        if (status && status !== "planned") return sum;

        const expenseCategory = normalizeString(
          expense?.budget_category ||
            expense?.expense_category ||
            expense?.category ||
            ""
        );
        const expenseBudgetId = normalizeString(
          expense?.budget_category_id || expense?.budget_item_id || ""
        );
        const itemId = normalizeString(item.id || item.key || "");
        const matchesId = itemId && expenseBudgetId && expenseBudgetId === itemId;
        const matchesCategory =
          normalizeLower(expenseCategory) === normalizeLower(item.title);

        if (!matchesId && !matchesCategory) return sum;
        if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) {
          return sum;
        }

        return sum + firstValidNumber(expense?.amount);
      }, 0);

      const allocated = firstValidNumber(item.allocated);
      const remaining = Math.max(allocated - spent, 0);
      const progress = allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0;

      return {
        ...item,
        allocated,
        allocated_amount: allocated,
        spent,
        spent_amount: spent,
        remaining,
        remaining_amount: remaining,
        progress,
        progress_pct: progress,
      };
    });

    const allocatedTotal = categoryRows.reduce((sum, item) => sum + firstValidNumber(item.allocated), 0);
    const totalSpent = categoryRows.reduce((sum, item) => sum + firstValidNumber(item.spent), 0);
    const declaredBudget = Math.max(declaredMonthlyBudgetAmount, allocatedTotal);
    const unallocated = Math.max(declaredBudget - allocatedTotal, 0);
    const isComplete = declaredBudget > 0 && allocatedTotal === declaredBudget && unallocated === 0;
    const isDraft = declaredBudget > 0 && !isComplete;
    const unplannedSpent = expenses.reduce((sum, expense) => {
      if (normalizeLower(expense?.planning_status) !== "unplanned") return sum;
      if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);
    const undocumentedSpent = expenses.reduce((sum, expense) => {
      if (normalizeLower(expense?.planning_status) !== "undocumented") return sum;
      if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    return {
      id: monthlyBudgetHeader?.id || `monthly_plan_${monthKey}`,
      month: monthKey,
      is_monthly_plan: true,
      is_active: true,
      is_complete: isComplete,
      is_draft: isDraft,
      status: isComplete ? "active" : isDraft ? "draft" : "empty",
      header: monthlyBudgetHeader,
      categories: categoryRows,
      category_count: categoryRows.length,
      declared_budget: declaredBudget,
      declared_amount: declaredBudget,
      monthly_budget_amount: declaredBudget,
      total_budget: allocatedTotal,
      allocated_amount: allocatedTotal,
      allocated_total: allocatedTotal,
      unallocated_amount: unallocated,
      spent: totalSpent,
      spent_amount: totalSpent,
      total_spent: totalSpent,
      remaining: Math.max(allocatedTotal - totalSpent, 0),
      remaining_amount: Math.max(allocatedTotal - totalSpent, 0),
      unplanned_spent: unplannedSpent,
      undocumented_spent: undocumentedSpent,
    };
  }, [declaredMonthlyBudgetAmount, expenses, manualExpenseBudgetOptions, monthlyBudgetHeader]);

  const budgetPlanIsComplete = monthlyBudgetPlan.is_complete === true;
  const budgetAllocatedSoFar = firstValidNumber(monthlyBudgetPlan.allocated_amount, monthlyBudgetPlan.allocated_total);
  const budgetCurrentEditAllocation =
    financeModal.type === "save_budget" && financeModal.payload?.id
      ? getBudgetTotal(financeModal.payload)
      : 0;
  const budgetFormDeclaredAmount = firstValidNumber(financeForm.monthlyBudgetAmount, monthlyBudgetPlan.declared_budget);
  const budgetFormCategoryAmount = firstValidNumber(financeForm.totalBudget);
  const budgetAllocatedExcludingCurrent = Math.max(budgetAllocatedSoFar - budgetCurrentEditAllocation, 0);
  const budgetProjectedAllocated = budgetAllocatedExcludingCurrent + budgetFormCategoryAmount;
  const budgetProjectedUnallocated = Math.max(budgetFormDeclaredAmount - budgetProjectedAllocated, 0);
  const budgetCanFinish =
    financeModal.type === "save_budget" &&
    budgetFormDeclaredAmount > 0 &&
    budgetProjectedAllocated === budgetFormDeclaredAmount &&
    monthlyBudgetPlan.category_count > 0;
  const budgetFinishHelper =
    budgetFormDeclaredAmount > 0 && budgetProjectedUnallocated > 0
      ? `Assign the remaining ${fmt(budgetProjectedUnallocated)} before completing your budget.`
      : "";

  const manualExpenseBudgetListItems = useMemo(
    () => [
      {
        key: "__unplanned__",
        title: "Unplanned Spending",
        subtitle: "Outside your completed monthly budget",
        tone: "amber",
        disabled: false,
      },
      {
        key: "__undocumented__",
        title: "Undocumented Spending",
        subtitle: "Spent but details are incomplete",
        tone: "cyan",
        disabled: false,
      },
      ...manualExpenseBudgetOptions.map((budgetItem) => ({
        key: budgetItem.key,
        title: budgetItem.title,
        subtitle: budgetPlanIsComplete ? "Planned monthly budget category" : "Finish budget first",
        tone: "neutral",
        disabled: !budgetPlanIsComplete,
      })),
    ],
    [budgetPlanIsComplete, manualExpenseBudgetOptions]
  );

  const programJourney = useMemo(
    () =>
      buildProgramJourney(tasks, submissions, {
        plan,
        profile: profileData || user,
        enrollment: latestEnrollment,
        programRecord,
      }),
    [latestEnrollment, plan, profileData, programRecord, submissions, tasks, user]
  );

  const activeTask = programJourney.todayItem || programJourney.activeItem;
  const nextTask = programJourney.nextItem;
  const onboardingDone = isProgramOnboardingCompleted();

  const hasPaidProgramAccess = useMemo(() => {
    const approved = isProgramApproved(profileData, isPaid, latestEnrollment);
    const nonFreeTier =
      normalizeLower(programJourney?.tier) !== "free" &&
      normalizeLower(profileData?.plan || plan) !== "free";
    return approved && nonFreeTier;
  }, [profileData, latestEnrollment, isPaid, programJourney?.tier, plan]);

  const taskReminder = useTaskReminderPrompt({
    user,
    task: activeTask,
  });

  const canShowTaskReminderPrompt =
    !!user?.id &&
    dailyRemindersEnabled &&
    hasPaidProgramAccess &&
    !!activeTask &&
    dashboardShellReady &&
    !onboardingDone &&
    !showOnboarding;

  const programBubble = getProgramBubbleContent(programJourney, {
    onboardingRequired: hasPaidProgramAccess && !onboardingDone,
  });

  const floatingProgramBubble =
    hasPaidProgramAccess && programBubble && programBubble.kind !== "task_reminder"
      ? programBubble
      : null;

  useEffect(() => {
    if (!floatingProgramBubble || !user?.id) {
      setProgramPromptSeenThisSession(false);
      return;
    }

    const seen = readProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
  }, [floatingProgramBubble, user?.id]);

  useEffect(() => {
    if (!user?.id || !floatingProgramBubble) return;
    if (floatingProgramBubble?.action !== "onboarding") return;

    const completed = hasCompletedProgramOnboarding(profileData);

    if (!completed) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);

      if (dashboardShellReady && !showOnboarding && dailyRemindersEnabled && hasPaidProgramAccess) {
        setShowProgramStart(true);
      }
    }
  }, [
    user?.id,
    floatingProgramBubble,
    profileData,
    showOnboarding,
    dailyRemindersEnabled,
    hasPaidProgramAccess,
    dashboardShellReady,
  ]);

  useEffect(() => {
    if (!dashboardShellReady) {
      setShowProgramStart(false);
      return;
    }

    if (!dailyRemindersEnabled) {
      setShowProgramStart(false);
      return;
    }

    if (!floatingProgramBubble || !user?.id) {
      setShowProgramStart(false);
      return;
    }

    if (!hasPaidProgramAccess) {
      setShowProgramStart(false);
      return;
    }

    if (showOnboarding) {
      setShowProgramStart(false);
      return;
    }

    const completed = hasCompletedProgramOnboarding(profileData);

    if (floatingProgramBubble?.action === "onboarding" && !completed) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);
      setShowProgramStart(true);
      return;
    }

    const seen = readProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
    setShowProgramStart(!seen);
  }, [
    dailyRemindersEnabled,
    floatingProgramBubble,
    hasPaidProgramAccess,
    showOnboarding,
    user?.id,
    profileData,
    dashboardShellReady,
  ]);

  const topWallet = useMemo(() => wallets[0] || null, [wallets]);

  const walletPreviewTransactions = useMemo(
    () => walletTransactions.slice(0, 2),
    [walletTransactions]
  );

  const activeBudget = useMemo(() => {
    if (!budgets.length) return null;

    const active =
      budgets.find(
        (budget) =>
          isTruthyActive(budget?.is_active) ||
          normalizeLower(budget?.status) === "active"
      ) || budgets[0];

    return active || null;
  }, [budgets]);

  const derivedActiveBudget = useMemo(() => {
    if (!activeBudget) return null;

    const spentFromExpenses = expenses.reduce((sum, expense) => {
      if (!isExpenseInsideBudgetWindow(expense, activeBudget)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const explicitSpent = getBudgetSpent(activeBudget);
    const spent = spentFromExpenses > 0 ? spentFromExpenses : explicitSpent;
    const total = getBudgetTotal(activeBudget);
    const remaining = Math.max(total - spent, 0);

    return {
      ...activeBudget,
      spent,
      spent_amount: spent,
      total_spent: spent,
      remaining,
      remaining_amount: remaining,
      amount_left: remaining,
    };
  }, [activeBudget, expenses]);

  const totalSavingsTarget = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0),
    [savingsGoals]
  );

  const totalSavingsSaved = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0),
    [savingsGoals]
  );

  const primarySavingsGoal = useMemo(() => savingsGoals[0] || null, [savingsGoals]);

  const claraAssistantContext = useMemo(() => {
    const safeWallets = Array.isArray(wallets) ? wallets : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeBudgets = Array.isArray(budgets) ? budgets : [];
    const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];
    const safeWalletTransactions = Array.isArray(walletTransactions)
      ? walletTransactions
      : [];
    const safePendingExpenses = Array.isArray(pendingExpenses) ? pendingExpenses : [];
    const currentMonthKey = getPHMonthKey();

    const readNumber = (...values) => {
      for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        const number =
          typeof value === "number"
            ? value
            : Number(String(value).replace(/[₱,\s]/g, ""));

        if (Number.isFinite(number)) return number;
      }

      return null;
    };

    const sumNumbers = (items, getValue) =>
      items.reduce((sum, item) => sum + (readNumber(getValue(item)) ?? 0), 0);

    const isCurrentMonthItem = (item) => {
      const itemDate = getTransactionDate(item);
      return Boolean(itemDate && getPHMonthKey(itemDate) === currentMonthKey);
    };

    const getExpensePlanningStatus = (expense) =>
      normalizeLower(
        expense?.planning_status ||
          expense?.planningStatus ||
          expense?.status ||
          ""
      );

    const getExpenseNeedType = (expense) =>
      normalizeLower(
        expense?.need_type ||
          expense?.needType ||
          expense?.spending_type ||
          expense?.type ||
          ""
      );

    const currentMonthExpenses = safeExpenses.filter(isCurrentMonthItem);
    const safeMonthlySpent = readNumber(thisMonthSpent) ?? sumNumbers(
      currentMonthExpenses,
      (expense) => expense?.amount
    );
    const recentExpenseRows = sortByNewestDate(safeExpenses).slice(0, 8);

    const plannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "planned";
    });
    const unplannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "unplanned";
    });
    const undocumentedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "undocumented";
    });
    const needsExpenseRows = currentMonthExpenses.filter((expense) => {
      const type = getExpenseNeedType(expense);
      return type === "need" || type === "needs" || type === "essential";
    });
    const wantsExpenseRows = currentMonthExpenses.filter((expense) => {
      const type = getExpenseNeedType(expense);
      return type === "want" || type === "wants" || type === "lifestyle";
    });

    const walletTotalFromRows = safeWallets.length
      ? sumNumbers(safeWallets, getWalletDisplayBalance)
      : null;
    const walletMoneyValue = readNumber(walletMoney);
    const safeTotalWalletBalance =
      walletTotalFromRows ?? (walletMoneyValue !== 0 ? walletMoneyValue : null);
    const safeTotalMoneyLeft =
      safeTotalWalletBalance ??
      readNumber(moneyLeftThisMonth) ??
      null;

    const incomeTransactionRows = safeWalletTransactions.filter((transaction) => {
      const type = normalizeLower(
        transaction?.type || transaction?.transaction_type || transaction?.kind
      );
      return INCOME_TRANSACTION_TYPES.has(type);
    });
    const currentMonthIncomeRows = incomeTransactionRows.filter(isCurrentMonthItem);
    const monthlyIncomeValue =
      currentMonthIncomeRows.length > 0
        ? sumNumbers(currentMonthIncomeRows, (transaction) => transaction?.amount)
        : readNumber(thisMonthIncome);
    const totalIncomeValue = incomeTransactionRows.length
      ? sumNumbers(incomeTransactionRows, (transaction) => transaction?.amount)
      : null;

    const declaredBudgetAmount = readNumber(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      monthlyBudgetPlan?.monthly_budget_amount
    );
    const hasBudgetData =
      safeBudgets.length > 0 ||
      Number(monthlyBudgetPlan?.category_count || 0) > 0 ||
      (declaredBudgetAmount !== null && declaredBudgetAmount > 0) ||
      Boolean(derivedActiveBudget);

    const budgetAllocated = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.allocated_amount,
          monthlyBudgetPlan?.allocated_total,
          monthlyBudgetPlan?.total_budget,
          derivedActiveBudget?.allocated_amount,
          derivedActiveBudget?.total_budget,
          derivedActiveBudget ? getBudgetTotal(derivedActiveBudget) : null
        )
      : null;
    const budgetSpent = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.spent,
          monthlyBudgetPlan?.spent_amount,
          monthlyBudgetPlan?.total_spent,
          derivedActiveBudget?.spent,
          derivedActiveBudget?.spent_amount,
          derivedActiveBudget?.total_spent,
          derivedActiveBudget ? getBudgetSpent(derivedActiveBudget) : null
        )
      : null;
    const budgetRemaining = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.remaining,
          monthlyBudgetPlan?.remaining_amount,
          derivedActiveBudget?.remaining,
          derivedActiveBudget?.remaining_amount,
          derivedActiveBudget?.amount_left,
          derivedActiveBudget ? getBudgetRemaining(derivedActiveBudget) : null
        )
      : null;

    const savingsSaved = safeSavingsGoals.length
      ? readNumber(totalSavingsSaved) ?? sumNumbers(safeSavingsGoals, getSavingsSaved)
      : null;
    const savingsTarget = safeSavingsGoals.length
      ? readNumber(totalSavingsTarget) ?? sumNumbers(safeSavingsGoals, getSavingsTarget)
      : null;

    const emergencyTarget = firstPositiveNumber(
      survivalExpense,
      profileData?.monthly_survival_expense,
      profileData?.survival_expense,
      profileData?.clara_survival_expense,
      profileData?.emergency_fund_target,
      profileData?.emergencyFundTarget
    );
    const emergencySaved = readNumber(
      profileData?.emergency_fund_saved,
      profileData?.emergencyFundSaved,
      profileData?.current_emergency_fund,
      profileData?.emergency_fund_amount,
      profileData?.emergency_saved
    );

    const categoryTotals = currentMonthExpenses.reduce((acc, expense) => {
      const category = getExpenseCategoryKey(expense);
      acc[category] = (acc[category] || 0) + (readNumber(expense?.amount) ?? 0);
      return acc;
    }, {});
    const topSpendingCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const normalizedWallets = safeWallets.map((wallet) => ({
      ...(wallet || {}),
      id: wallet?.id || null,
      name: getWalletDisplayName(wallet),
      balance: readNumber(getWalletDisplayBalance(wallet)),
    }));

    const normalizedExpenses = safeExpenses.map((expense) => ({
      ...(expense || {}),
      id: expense?.id || null,
      amount: readNumber(expense?.amount),
      category: getExpenseCategoryKey(expense),
      date: expense?.date || expense?.expense_date || expense?.created_at || null,
      need_type:
        expense?.need_type ||
        expense?.needType ||
        expense?.spending_type ||
        null,
      planning_status:
        expense?.planning_status ||
        expense?.planningStatus ||
        expense?.status ||
        null,
      unplanned_reason: expense?.unplanned_reason || null,
      notes: normalizeString(expense?.notes || expense?.description || ""),
    }));

    const normalizedBudgets = safeBudgets.map((budget) => ({
      ...(budget || {}),
      id: budget?.id || null,
      name: getBudgetListTitle(budget),
      allocated: readNumber(getBudgetTotal(budget)),
      allocated_amount: readNumber(getBudgetTotal(budget)),
      spent: readNumber(getBudgetSpent(budget)),
      spent_amount: readNumber(getBudgetSpent(budget)),
      remaining: readNumber(getBudgetRemaining(budget)),
      remaining_amount: readNumber(getBudgetRemaining(budget)),
      need_type: getBudgetNeedType(budget),
    }));

    const normalizedSavingsGoals = safeSavingsGoals.map((goal) => ({
      ...(goal || {}),
      id: goal?.id || null,
      name: getSavingsGoalTitle(goal),
      title: getSavingsGoalTitle(goal),
      saved: readNumber(getSavingsSaved(goal)),
      saved_amount: readNumber(getSavingsSaved(goal)),
      target: readNumber(getSavingsTarget(goal)),
      target_amount: readNumber(getSavingsTarget(goal)),
    }));

    const normalizeExpenseList = (rows) =>
      rows.map((expense) => ({
        ...(expense || {}),
        id: expense?.id || null,
        amount: readNumber(expense?.amount),
        category: getExpenseCategoryKey(expense),
        date: expense?.date || expense?.expense_date || expense?.created_at || null,
        need_type:
          expense?.need_type ||
          expense?.needType ||
          expense?.spending_type ||
          null,
        planning_status:
          expense?.planning_status ||
          expense?.planningStatus ||
          expense?.status ||
          null,
        notes: normalizeString(expense?.notes || expense?.description || ""),
      }));

    return {
      userName:
        nickname ||
        profileData?.full_name ||
        profileData?.display_name ||
        profileData?.nickname ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")?.[0] ||
        "there",
      offlineReady,
      online: isClaraOnline(),
      pendingExpenses: safePendingExpenses,
      localExpenses: normalizedExpenses.filter((expense) => expense?.local_only),
      pendingLocalExpenses: safePendingExpenses,

      wallets: normalizedWallets,
      expenses: normalizedExpenses,
      budgets: normalizedBudgets,
      savingsGoals: normalizedSavingsGoals,
      emergencyFund: {
        saved: emergencySaved,
        current: emergencySaved,
        current_amount: emergencySaved,
        target: emergencyTarget > 0 ? emergencyTarget : null,
        target_amount: emergencyTarget > 0 ? emergencyTarget : null,
        summary:
          emergencyTarget > 0
            ? `Your emergency baseline is ${fmt(emergencyTarget)}.`
            : "",
      },
      walletTransactions: safeWalletTransactions,
      transfers: [],

      totalWalletBalance: safeTotalWalletBalance,
      totalAvailableMoney: safeTotalMoneyLeft,
      availableMoney: safeTotalMoneyLeft,
      totalMoneyLeft: safeTotalMoneyLeft,
      moneyLeftThisMonth: readNumber(moneyLeftThisMonth),

      monthlySpent: safeMonthlySpent,
      totalExpensesThisMonth: safeMonthlySpent,
      thisMonthSpent: safeMonthlySpent,
      monthlyExpenses: safeMonthlySpent,
      currentMonthExpenses: normalizeExpenseList(currentMonthExpenses),

      monthlyIncome: monthlyIncomeValue,
      totalIncome: totalIncomeValue,
      addedFunds: totalIncomeValue,

      budgetAllocated,
      budgetSpent,
      budgetRemaining,
      budget: {
        ...(monthlyBudgetPlan || {}),
        allocated: budgetAllocated,
        allocated_amount: budgetAllocated,
        spent: budgetSpent,
        spent_amount: budgetSpent,
        remaining: budgetRemaining,
        remaining_amount: budgetRemaining,
        summary:
          budgetAllocated !== null
            ? `Your current budget shows ${fmt(budgetSpent || 0)} spent out of ${fmt(
                budgetAllocated
              )} allocated.`
            : "",
        categories: Array.isArray(budgetSummaries) ? budgetSummaries : [],
      },

      totalSavingsSaved: savingsSaved,
      totalSavingsTarget: savingsTarget,
      savings: {
        saved: savingsSaved,
        saved_amount: savingsSaved,
        target: savingsTarget,
        target_amount: savingsTarget,
        summary:
          savingsTarget !== null
            ? `Your savings progress is ${fmt(savingsSaved || 0)} out of ${fmt(
                savingsTarget
              )}.`
            : safeSavingsGoals.length
              ? `You have ${safeSavingsGoals.length} savings goal${
                  safeSavingsGoals.length === 1 ? "" : "s"
                } tracked.`
              : "",
      },

      emergencyFundSaved: emergencySaved,
      emergencyFundTarget: emergencyTarget > 0 ? emergencyTarget : null,

      needsSpending: needsExpenseRows.length
        ? sumNumbers(needsExpenseRows, (expense) => expense?.amount)
        : null,
      wantsSpending: wantsExpenseRows.length
        ? sumNumbers(wantsExpenseRows, (expense) => expense?.amount)
        : null,
      plannedExpenses: normalizeExpenseList(plannedExpenseRows),
      unplannedExpenses: normalizeExpenseList(unplannedExpenseRows),
      undocumentedExpenses: normalizeExpenseList(undocumentedExpenseRows),

      plannedSpent: plannedExpenseRows.length
        ? sumNumbers(plannedExpenseRows, (expense) => expense?.amount)
        : null,
      unplannedSpent:
        readNumber(monthlyBudgetPlan?.unplanned_spent) ??
        (unplannedExpenseRows.length
          ? sumNumbers(unplannedExpenseRows, (expense) => expense?.amount)
          : null),
      undocumentedSpent:
        readNumber(monthlyBudgetPlan?.undocumented_spent) ??
        (undocumentedExpenseRows.length
          ? sumNumbers(undocumentedExpenseRows, (expense) => expense?.amount)
          : null),

      topSpendingCategory,
      recentExpenses: normalizeExpenseList(recentExpenseRows),
      budgetCategories: Array.isArray(budgetSummaries) ? budgetSummaries : [],
      manualExpenseBudgetOptions: Array.isArray(manualExpenseBudgetOptions)
        ? manualExpenseBudgetOptions
        : [],
    };
  }, [
    budgetSummaries,
    budgets,
    derivedActiveBudget,
    expenses,
    manualExpenseBudgetOptions,
    moneyLeftThisMonth,
    monthlyBudgetPlan,
    nickname,
    offlineReady,
    pendingExpenses,
    profileData,
    savingsGoals,
    survivalExpense,
    thisMonthIncome,
    thisMonthSpent,
    totalSavingsSaved,
    totalSavingsTarget,
    user,
    walletMoney,
    walletTransactions,
    wallets,
  ]);

  useEffect(() => {
    if (!DEBUG_FINANCE_DIAGNOSTICS) return;

    const toFinanceNumber = (value) => {
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      const cleaned = String(value ?? "").replace(/[₱,\s]/g, "");
      const number = Number(cleaned);
      return Number.isFinite(number) ? number : 0;
    };

    const getSignedLedgerAmount = (transaction) => {
      const type = normalizeLower(
        transaction?.type || transaction?.transaction_type || transaction?.kind
      );
      const amount = toFinanceNumber(transaction?.amount);

      if (
        [
          "expense",
          "transfer_out",
          "savings_goal",
          "savings_transfer",
          "reset",
          "debit",
          "withdrawal",
        ].includes(type)
      ) {
        return -amount;
      }

      if (
        [
          "income",
          "add",
          "cash_in",
          "deposit",
          "transfer_in",
          "opening_balance",
          "credit",
        ].includes(type)
      ) {
        return amount;
      }

      return 0;
    };

    const isExpenseType = (transaction) =>
      normalizeLower(transaction?.type || transaction?.transaction_type || transaction?.kind) ===
      "expense";

    const currentMonthKey = getPHMonthKey();
    const normalizedWalletBalanceSum = wallets.reduce(
      (sum, wallet) => sum + toFinanceNumber(getWalletDisplayBalance(wallet)),
      0
    );
    const walletLedgerNetTotal = walletTransactions.reduce(
      (sum, transaction) => sum + getSignedLedgerAmount(transaction),
      0
    );
    const expenseTableMonthlyRows = expenses.filter((expense) => {
      const expenseDate = getTransactionDate(expense);
      return expenseDate && getPHMonthKey(expenseDate) === currentMonthKey;
    });
    const expenseTableMonthlySum = expenseTableMonthlyRows.reduce(
      (sum, expense) => sum + toFinanceNumber(expense?.amount),
      0
    );
    const walletTransactionExpenseMonthlyRows = walletTransactions.filter((transaction) => {
      const transactionDate = getTransactionDate(transaction);
      return (
        isExpenseType(transaction) &&
        transactionDate &&
        getPHMonthKey(transactionDate) === currentMonthKey
      );
    });
    const walletTransactionExpenseMonthlySum = walletTransactionExpenseMonthlyRows.reduce(
      (sum, transaction) => sum + toFinanceNumber(transaction?.amount),
      0
    );
    const tolerance = 0.01;
    const differs = (a, b) => Math.abs(toFinanceNumber(a) - toFinanceNumber(b)) > tolerance;

    const walletSummaries = Array.isArray(claraAssistantContext?.wallets)
      ? claraAssistantContext.wallets.map((wallet) => ({
          id: wallet?.id,
          name: wallet?.name,
          balance: wallet?.balance,
        }))
      : [];

    const diagnostics = {
      walletTotals: {
        dashboardWalletMoney: toFinanceNumber(walletMoney),
        dashboardTotalMoneyLeft: toFinanceNumber(claraAssistantContext?.totalMoneyLeft),
        normalizedWalletBalanceSum,
        walletLedgerNetTotal,
        walletsLoaded: wallets.length,
      },
      monthlySpending: {
        dashboardThisMonthSpent: toFinanceNumber(thisMonthSpent),
        expenseTableMonthlySum,
        walletTransactionExpenseMonthlySum,
        expenseRowsThisMonth: expenseTableMonthlyRows.length,
        walletTransactionExpenseRowsThisMonth: walletTransactionExpenseMonthlyRows.length,
      },
      claraContext: {
        totalAvailableMoney: toFinanceNumber(claraAssistantContext?.totalMoneyLeft),
        monthlySpent: toFinanceNumber(claraAssistantContext?.totalExpensesThisMonth),
        walletCount: walletSummaries.length,
        walletSummaries,
        cashFlowRemaining: toFinanceNumber(moneyLeftThisMonth),
      },
      mismatchFlags: {
        walletMoneyDiffersFromWalletBalanceSum: differs(walletMoney, normalizedWalletBalanceSum),
        dashboardMonthlySpentDiffersFromExpenseTableMonthlySum: differs(
          thisMonthSpent,
          expenseTableMonthlySum
        ),
        walletTransactionExpenseTotalDiffersFromExpensesTableTotal: differs(
          walletTransactionExpenseMonthlySum,
          expenseTableMonthlySum
        ),
      },
    };

    console.groupCollapsed("CLARA Finance Diagnostics");
    console.table([diagnostics.walletTotals]);
    console.table([diagnostics.monthlySpending]);
    console.log("CLARA context:", diagnostics.claraContext);
    console.table([diagnostics.mismatchFlags]);

    Object.entries(diagnostics.mismatchFlags).forEach(([key, value]) => {
      if (value) {
        console.warn(`CLARA Finance Diagnostics mismatch: ${key}`, diagnostics);
      }
    });

    console.groupEnd();
  }, [
    claraAssistantContext,
    expenses,
    moneyLeftThisMonth,
    thisMonthSpent,
    walletMoney,
    walletTransactions,
    wallets,
  ]);


  const clearDashboardScrollTimers = useCallback(() => {
    dashboardScrollTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    dashboardScrollTimersRef.current = [];
  }, []);

  const measureDashboardScrollability = useCallback(() => {
    if (activeDashboardPanel !== "home" || !expandedFinanceCard) {
      setIsDashboardScrollable(false);
      return false;
    }

    const scrollNode = dashboardScrollRef.current;
    const contentNode = dashboardContentRef.current;
    if (!scrollNode || !contentNode || typeof window === "undefined") {
      setIsDashboardScrollable(false);
      return false;
    }

    const viewportHeight = Math.max(window.innerHeight || 0, scrollNode.clientHeight || 0);
    const contentHeight = Math.max(
      scrollNode.scrollHeight || 0,
      contentNode.scrollHeight || 0,
      contentNode.getBoundingClientRect?.().height || 0
    );
    const shouldScroll = contentHeight > viewportHeight + 8;

    setIsDashboardScrollable(shouldScroll);
    return shouldScroll;
  }, [activeDashboardPanel, expandedFinanceCard]);

  const scheduleDashboardScrollMeasure = useCallback(() => {
    if (typeof window === "undefined") return;

    clearDashboardScrollTimers();
    window.requestAnimationFrame(() => {
      measureDashboardScrollability();
    });

    [120, 280, 380].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        measureDashboardScrollability();
      }, delay);
      dashboardScrollTimersRef.current.push(timerId);
    });
  }, [clearDashboardScrollTimers, measureDashboardScrollability]);

  const toggleFinanceDetails = useCallback((cardKey, options = {}) => {
    const { autoExpand = false, forceOpen = false } = options || {};

    setExpandedFinanceCard((prev) => {
      const next = forceOpen ? cardKey : prev === cardKey ? null : cardKey;

      if (next && autoExpand) {
        setExpandedFinanceDetailSections((current) => ({
          ...current,
          [next]: true,
        }));
      }

      if (!next) {
        setIsDashboardScrollable(false);
        window.requestAnimationFrame(() => {
          dashboardScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
        });
      }

      return next;
    });
  }, []);

  const toggleExpandedFinanceDetailSection = useCallback((cardKey) => {
    setExpandedFinanceDetailSections((current) => ({
      ...current,
      [cardKey]: current?.[cardKey] === false ? true : false,
    }));
  }, []);

  useEffect(() => {
    scheduleDashboardScrollMeasure();

    if (!expandedFinanceCard) {
      setIsDashboardScrollable(false);
      dashboardScrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    }

    return clearDashboardScrollTimers;
  }, [
    activeDashboardPanel,
    expandedFinanceCard,
    dashboardViewportMode,
    scheduleDashboardScrollMeasure,
    clearDashboardScrollTimers,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      scheduleDashboardScrollMeasure();
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [scheduleDashboardScrollMeasure]);

  const showFinanceNotice = useCallback((message, type = "error") => {
    setFinanceNotice({ message, type });
  }, []);

  const closeFinanceNotice = useCallback(() => {
    setFinanceNotice(null);
  }, []);

  const closeFinanceModal = useCallback(() => {
    setBudgetExitConfirm(false);
    setBudgetListOpen(false);
    setFinanceModal({ type: null, payload: null });
  }, []);

  const openCreateWalletModal = useCallback(() => {
    setFinanceForm({
      name: "",
      type: "cash",
      customWalletType: "",
      startingBalance: "0",
      amount: "",
      destinationWalletId: "",
      totalBudget: "",
      needsPct: "50",
      wantsPct: "30",
      otherPct: "20",
      title: "",
      targetAmount: "",
      savingsWalletId: "",
      category: "",
      subcategory: "",
      plannedUseDate: "",
      reasonOne: "",
      reasonTwo: "",
      reasonThree: "",
      emotionalValue: "joy",
      priority: "medium",
      flexibility: "flexible",
      notes: "",
    });
    setFinanceModal({ type: "create_wallet", payload: null });
  }, []);

  const openDeleteWalletModal = useCallback((walletId) => {
    const wallet = wallets.find((item) => String(item.id) === String(walletId)) || null;
    setFinanceModal({ type: "delete_wallet", payload: wallet });
  }, [wallets]);

  const openAddMoneyModal = useCallback((wallet) => {
    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
    }));
    setFinanceModal({ type: "add_money", payload: wallet });
  }, []);

  const openTransferMoneyModal = useCallback((fromWallet) => {
    const destinationOptions = wallets.filter(
      (wallet) => String(wallet.id) !== String(fromWallet?.id)
    );

    if (destinationOptions.length < 1) {
      showFinanceNotice("Create another wallet first before transferring.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      destinationWalletId: String(destinationOptions[0]?.id || ""),
    }));
    setFinanceModal({ type: "transfer_money", payload: fromWallet });
  }, [wallets, showFinanceNotice]);

  const openManualExpenseModal = useCallback(() => {
    if (!wallets.length) {
      showFinanceNotice("Create or fund a wallet first before logging an expense.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      budgetListKey: "",
      expenseWalletId: String(wallets[0]?.id || ""),
      unplannedReason: "",
      undocumentedReason: "",
      undocumentedNote: "",
      notes: "",
    }));
    setBudgetListOpen(false);
    setFinanceModal({ type: "manual_expense", payload: null });
  }, [showFinanceNotice, wallets]);

  const getClaraAiOrbButtonFromEvent = useCallback((event) => {
    const target = event?.target;
    if (!target?.closest) return null;

    const emergencyCard = target.closest("[data-emergency-card]");
    if (!emergencyCard) return null;

    const button = target.closest("button");
    if (!button || !emergencyCard.contains(button)) return null;

    const buttonSignature = [
      button.getAttribute?.("aria-label"),
      button.getAttribute?.("title"),
      button.textContent,
    ]
      .map((value) => normalizeLower(value))
      .filter(Boolean)
      .join(" ");

    if (
      buttonSignature.includes("clara ai") ||
      buttonSignature.includes("clara") ||
      buttonSignature.includes("assistant") ||
      buttonSignature.includes("ask")
    ) {
      return button;
    }

    return null;
  }, []);

  const isClaraAiOrbEvent = useCallback((event) => {
    return Boolean(getClaraAiOrbButtonFromEvent(event));
  }, [getClaraAiOrbButtonFromEvent]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openClaraAiFromLongPress = useCallback(() => {
    setShowAiAssistant(true);
  }, []);

  const startClaraAiLongPress = useCallback((event) => {
    if (!isClaraAiOrbEvent(event)) return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openClaraAiFromLongPress();
    }, 550);
  }, [clearLongPressTimer, isClaraAiOrbEvent, openClaraAiFromLongPress]);

  const endClaraAiLongPress = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleClaraAiOrbClickCapture = useCallback((event) => {
    if (!isClaraAiOrbEvent(event)) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return true;
    }

    openManualExpenseModal();
    return true;
  }, [isClaraAiOrbEvent, openManualExpenseModal]);


  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const startMoneyLeftOrbLongPress = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openClaraAiFromLongPress();
    }, 550);
  }, [clearLongPressTimer, openClaraAiFromLongPress, stopMoneyLeftOrbEvent]);

  const endMoneyLeftOrbLongPress = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);
    clearLongPressTimer();
  }, [clearLongPressTimer, stopMoneyLeftOrbEvent]);

  const handleMoneyLeftOrbClick = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    openManualExpenseModal();
  }, [openManualExpenseModal, stopMoneyLeftOrbEvent]);




  return {
    moneyLeftSummaryHandlers,
    handleMoneyLeftOrbClick,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    stopMoneyLeftOrbEvent,
  };
}
