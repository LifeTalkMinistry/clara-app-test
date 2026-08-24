import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, PiggyBank, X } from "lucide-react";
import useFinancialData from "@/hooks/useFinancialData";

const OTHER_OPTION = "__other__";

const CATEGORIES = {
  "Celebrations & Gifts": [
    "Birthday",
    "Wedding",
    "Anniversary",
    "Holiday",
    "Family Event",
    "Special Occasion",
  ],
  "Personal Purchases": [
    "Gadget / Electronics",
    "Clothing / Accessories",
    "Furniture / Appliances",
    "Vehicle / Transport",
    "Hobby / Collection",
    "Personal Upgrade",
  ],
  Experiences: [
    "Travel",
    "Vacation",
    "Concert / Event",
    "Retreat",
    "Recreation / Adventure",
    "Staycation",
  ],
  "Financial / Protection": [
    "Emergency Fund",
    "Insurance",
    "Investment",
    "Debt Payment",
    "Retirement",
    "Tax / Legal",
  ],
  "Health & Wellness": [
    "Medical",
    "Dental / Vision",
    "Medicine / Treatment",
    "Self-Care",
    "Fitness / Gym",
    "Mental Health",
  ],
  "Education & Growth": [
    "Tuition / School Fees",
    "Course / Certification",
    "Books / Learning Materials",
    "Training / Workshop",
    "Study Equipment",
    "Skill Development",
  ],
  "Home & Family": [
    "Home Improvement",
    "Rent / Moving",
    "Household Appliance",
    "Child / Family Needs",
    "Family Support",
    "Pet Care",
  ],
  "Career & Business": [
    "Business Capital",
    "Equipment / Tools",
    "Professional Fees",
    "Job Transition",
    "Side Hustle",
    "Marketing / Expansion",
  ],
  "Faith & Community": [
    "Church Project",
    "Ministry / Mission",
    "Donation / Outreach",
    "Community Event",
    "Retreat / Conference",
    "Volunteer Activity",
  ],
};

const EMOTIONAL_VALUES = [
  { value: "joy", label: "Joy 😄" },
  { value: "security", label: "Security 🛡️" },
  { value: "experience", label: "Experience 🌟" },
  { value: "milestone", label: "Milestone 🏆" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent 🔥" },
];

const STARTER_IDEAS = ["Phone", "Travel", "Emergency", "Gift"];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanMoney(value = "") {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function fmt(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function firstNameFromUser(user = {}) {
  const raw = clean(
    user?.firstName ||
      user?.first_name ||
      user?.displayName ||
      user?.display_name ||
      user?.name ||
      user?.fullName ||
      user?.full_name ||
      ""
  );
  if (raw) return raw.split(" ")[0];
  const email = clean(user?.email);
  return email.includes("@") ? email.split("@")[0] : "there";
}

function getWalletId(wallet = {}) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || "").trim();
}

function getWalletName(wallet = {}) {
  return clean(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet") || "Wallet";
}

function getWalletBalance(wallet = {}) {
  return toNumber(
    wallet?.balance ??
      wallet?.derived_balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.amount ??
      0
  );
}

function getWalletEmergencyProtectedAmount(wallet = {}) {
  return toNumber(
    wallet?.emergencyProtectedAmount ??
      wallet?.emergency_protected_amount ??
      wallet?.protectedEmergencyAmount ??
      wallet?.protected_emergency_amount ??
      0
  );
}

function getGoalSavedAmount(goal = {}) {
  return toNumber(
    goal?.saved_amount ??
      goal?.savedAmount ??
      goal?.current_amount ??
      goal?.currentAmount ??
      goal?.saved ??
      goal?.amount_saved ??
      0
  );
}

function isActiveWallet(wallet) {
  return Boolean(wallet && getWalletId(wallet) && !wallet?.deletedAt && !wallet?.deleted_at && !wallet?.is_archived);
}

function formatDate(dateKey) {
  if (!dateKey) return "No planned date";
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return String(dateKey);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function generateId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function Bubble({ role = "assistant", children }) {
  const user = role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[13px] font-semibold leading-5 shadow-[0_12px_28px_rgba(0,0,0,.2)] ${
          user
            ? "rounded-tr-[7px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white"
            : "rounded-tl-[7px] border border-blue-200/12 bg-[#0a1933]/94 text-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Composer({ value, onChange, onSubmit, placeholder, inputMode = "text" }) {
  return (
    <form
      data-clara-buy-check-react-form="true"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#07142b]/96 p-2 shadow-[0_14px_34px_rgba(0,0,0,.28)]"
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-white outline-none placeholder:text-slate-400/55"
      />
      <button
        type="submit"
        disabled={!clean(value)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1769ff] text-white disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}

function ReplyButton({ children, onClick, secondary = false, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[17px] border px-3.5 py-2.5 text-left text-[12px] font-black leading-4 transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-40 ${
        secondary
          ? "border-white/10 bg-white/[.035] text-white/82"
          : "border-blue-300/22 bg-[#0b2144]/92 text-white shadow-[0_8px_20px_rgba(0,0,0,.16)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value, accent = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 ${
        accent
          ? "border-cyan-300/20 bg-cyan-300/[0.07]"
          : "border-blue-300/[0.08] bg-[#08285A]/45"
      }`}
    >
      <span className={`text-[11px] font-semibold ${accent ? "text-cyan-100/70" : "text-blue-100/48"}`}>
        {label}
      </span>
      <span className={`max-w-[62%] text-right text-sm font-black ${accent ? "text-cyan-100" : "text-white/95"}`}>
        {value}
      </span>
    </div>
  );
}

export default function ClaraSavingsGoalOverlay({
  isActive = false,
  claraAssistantContext = {},
  onClose,
}) {
  const user = claraAssistantContext?.user || {};
  const firstName = firstNameFromUser(user);
  const viewportRef = useRef(null);
  const finance = useFinancialData(user);
  const sourceWallets = Array.isArray(finance?.wallets)
    ? finance.wallets
    : Array.isArray(claraAssistantContext?.wallets)
      ? claraAssistantContext.wallets
      : [];
  const sourceGoals = Array.isArray(finance?.savingsGoals)
    ? finance.savingsGoals
    : Array.isArray(claraAssistantContext?.savingsGoals)
      ? claraAssistantContext.savingsGoals
      : [];

  const activeWallets = useMemo(
    () => sourceWallets.filter(isActiveWallet).map((wallet) => ({
      ...wallet,
      id: getWalletId(wallet),
      name: getWalletName(wallet),
      balance: getWalletBalance(wallet),
    })),
    [sourceWallets]
  );

  const protectedSavingsByWallet = useMemo(() => {
    const map = {};
    sourceGoals
      .filter((goal) => !goal?.deletedAt && !goal?.deleted_at)
      .forEach((goal) => {
        const id = getWalletId({ id: goal?.wallet_id || goal?.walletId || "" });
        if (!id) return;
        map[id] = (map[id] || 0) + Math.max(getGoalSavedAmount(goal), 0);
      });
    return map;
  }, [sourceGoals]);

  const walletAvailableBalances = useMemo(() => {
    const map = {};
    activeWallets.forEach((wallet) => {
      const rawBalance = Math.max(getWalletBalance(wallet), 0);
      const emergencyProtected = Math.min(getWalletEmergencyProtectedAmount(wallet), rawBalance);
      const savingsProtected = Math.min(
        Math.max(protectedSavingsByWallet[wallet.id] || 0, 0),
        Math.max(rawBalance - emergencyProtected, 0)
      );
      map[wallet.id] = Math.max(rawBalance - emergencyProtected - savingsProtected, 0);
    });
    return map;
  }, [activeWallets, protectedSavingsByWallet]);

  const greeting = `Savings Goals is open, ${firstName}. What are you saving for?`;
  const [phase, setPhase] = useState("title");
  const [messages, setMessages] = useState(() => [
    { role: "assistant", text: greeting },
    {
      role: "assistant",
      text: "Choose one real-life target first. Give the money a name, a reason, and a finish line.",
    },
  ]);
  const [titleInput, setTitleInput] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [targetAmount, setTargetAmount] = useState(0);
  const [savedInput, setSavedInput] = useState("");
  const [savedAmount, setSavedAmount] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [plannedUseDate, setPlannedUseDate] = useState("");
  const [reasons, setReasons] = useState(["", "", ""]);
  const [reasonInput, setReasonInput] = useState("");
  const [emotionalValue, setEmotionalValue] = useState("joy");
  const [priority, setPriority] = useState("medium");
  const [notesInput, setNotesInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedWallet = activeWallets.find((wallet) => wallet.id === walletId) || null;
  const subcategoryOptions = category && CATEGORIES[category] ? CATEGORIES[category] : [];
  const reasonIndex = phase === "reason-1" ? 0 : phase === "reason-2" ? 1 : phase === "reason-3" ? 2 : -1;

  const appendExchange = (userText, assistantText) => {
    setMessages((current) => [
      ...current,
      ...(userText ? [{ role: "user", text: userText }] : []),
      ...(assistantText ? [{ role: "assistant", text: assistantText }] : []),
    ]);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, phase, error, saved]);

  if (!isActive) return null;

  const askTarget = (userText) => {
    appendExchange(userText, "How much is your target amount?");
    setPhase("target");
  };

  const chooseTitle = (nextTitle) => {
    const cleanTitle = clean(nextTitle);
    if (!cleanTitle) return;
    setTitle(cleanTitle);
    setTitleInput("");
    setError("");
    appendExchange(cleanTitle, "What category fits this goal? You can skip this if you do not need one.");
    setPhase("category");
  };

  const submitTitle = () => chooseTitle(titleInput);

  const chooseCategory = (nextCategory) => {
    setError("");
    if (!nextCategory) {
      setCategory("");
      setSubcategory("");
      askTarget("Skip category");
      return;
    }
    if (nextCategory === OTHER_OPTION) {
      setCustomInput("");
      appendExchange("Other", "Type your specific category.");
      setPhase("custom-category");
      return;
    }
    setCategory(nextCategory);
    setSubcategory("");
    appendExchange(nextCategory, "Choose a subcategory, or skip it.");
    setPhase("subcategory");
  };

  const submitCustomCategory = () => {
    const nextCategory = clean(customInput);
    if (!nextCategory) return;
    setCategory(nextCategory);
    setCustomInput("");
    appendExchange(nextCategory, "Specific detail is optional. Add one, or skip.");
    setPhase("custom-detail");
  };

  const submitCustomDetail = () => {
    const detail = clean(customInput);
    if (!detail) return;
    setSubcategory(detail);
    setCustomInput("");
    askTarget(detail);
  };

  const skipCustomDetail = () => {
    setSubcategory("");
    setCustomInput("");
    askTarget("Skip specific detail");
  };

  const chooseSubcategory = (nextSubcategory) => {
    if (!nextSubcategory) {
      setSubcategory("");
      askTarget("Skip subcategory");
      return;
    }
    if (nextSubcategory === OTHER_OPTION) {
      setCustomInput("");
      appendExchange("Other", "Type your specific subcategory.");
      setPhase("custom-subcategory");
      return;
    }
    setSubcategory(nextSubcategory);
    askTarget(nextSubcategory);
  };

  const submitCustomSubcategory = () => {
    const nextSubcategory = clean(customInput);
    if (!nextSubcategory) return;
    setSubcategory(nextSubcategory);
    setCustomInput("");
    askTarget(nextSubcategory);
  };

  const submitTarget = () => {
    const amount = toNumber(targetInput);
    if (amount <= 0) {
      setError("Enter a valid target amount.");
      return;
    }
    setTargetAmount(amount);
    setTargetInput("");
    setError("");
    appendExchange(fmt(amount), "How much have you already saved for this goal? You can choose none yet.");
    setPhase("saved-amount");
  };

  const chooseSavedAmount = (amount, label) => {
    const safeAmount = Math.max(toNumber(amount), 0);
    if (safeAmount > targetAmount) {
      setError("Already Saved cannot be higher than the target amount.");
      return;
    }
    setSavedAmount(safeAmount);
    setSavedInput("");
    setError("");
    appendExchange(label || fmt(safeAmount), "Where should this goal be saved? Choose a wallet, or continue without one if nothing is saved yet.");
    setPhase("wallet");
  };

  const submitSavedAmount = () => chooseSavedAmount(savedInput, fmt(toNumber(savedInput)));

  const chooseWallet = (wallet) => {
    const available = Math.max(toNumber(walletAvailableBalances[wallet.id]), 0);
    if (savedAmount > 0 && available + 0.0001 < savedAmount) {
      setError("This wallet does not have enough unprotected money for the Already Saved amount.");
      return;
    }
    setWalletId(wallet.id);
    setError("");
    appendExchange(`${wallet.name} · Available ${fmt(available)}`, "When do you plan to use this savings? The date is optional.");
    setPhase("date");
  };

  const chooseNoWallet = () => {
    if (savedAmount > 0) {
      setError("Choose an available wallet before marking money as already saved.");
      return;
    }
    setWalletId("");
    setError("");
    appendExchange("No wallet yet", "When do you plan to use this savings? The date is optional.");
    setPhase("date");
  };

  const chooseDate = (dateValue = plannedUseDate) => {
    setPlannedUseDate(dateValue || "");
    setError("");
    appendExchange(dateValue ? formatDate(dateValue) : "No planned date", "Reason 1 of 3: Why does this goal matter to you? This is optional.");
    setPhase("reason-1");
  };

  const submitReason = () => {
    if (reasonIndex < 0) return;
    const nextReason = clean(reasonInput);
    if (!nextReason) return;
    const nextReasons = [...reasons];
    nextReasons[reasonIndex] = nextReason;
    setReasons(nextReasons);
    setReasonInput("");
    if (reasonIndex < 2) {
      appendExchange(nextReason, `Reason ${reasonIndex + 2} of 3: Add another motivation, or skip.`);
      setPhase(`reason-${reasonIndex + 2}`);
    } else {
      appendExchange(nextReason, "What emotional value best fits this goal?");
      setPhase("emotional");
    }
  };

  const skipReason = () => {
    if (reasonIndex < 0) return;
    const nextReasons = [...reasons];
    nextReasons[reasonIndex] = "";
    setReasons(nextReasons);
    setReasonInput("");
    if (reasonIndex < 2) {
      appendExchange("Skip", `Reason ${reasonIndex + 2} of 3: Add another motivation, or skip.`);
      setPhase(`reason-${reasonIndex + 2}`);
    } else {
      appendExchange("Skip", "What emotional value best fits this goal?");
      setPhase("emotional");
    }
  };

  const chooseEmotionalValue = (item) => {
    setEmotionalValue(item.value);
    appendExchange(item.label, "How important is this goal right now?");
    setPhase("priority");
  };

  const choosePriority = (item) => {
    setPriority(item.value);
    appendExchange(item.label, "Any notes for this Savings Goal? This is optional.");
    setPhase("notes");
  };

  const goToReview = (nextNotes, userText) => {
    setNotes(clean(nextNotes));
    setNotesInput("");
    appendExchange(userText, "Review your Savings Goal before I create it.");
    setPhase("review");
  };

  const submitNotes = () => {
    const nextNotes = clean(notesInput);
    if (!nextNotes) return;
    goToReview(nextNotes, nextNotes);
  };

  const skipNotes = () => goToReview("", "Skip notes");

  const saveGoal = async () => {
    if (saving) return;
    setError("");
    if (!user?.id && !user?.email) {
      setError("No user was found. Please log in again.");
      return;
    }
    if (!title) {
      setPhase("title");
      setError("Enter a goal title.");
      return;
    }
    if (targetAmount <= 0) {
      setPhase("target");
      setError("Enter a valid target amount.");
      return;
    }
    if (savedAmount > targetAmount) {
      setPhase("saved-amount");
      setError("Already Saved cannot be higher than the target amount.");
      return;
    }
    if (savedAmount > 0 && !selectedWallet) {
      setPhase("wallet");
      setError("Choose an available wallet before marking money as saved.");
      return;
    }
    if (selectedWallet && savedAmount > 0) {
      const available = Math.max(toNumber(walletAvailableBalances[selectedWallet.id]), 0);
      if (available + 0.0001 < savedAmount) {
        setPhase("wallet");
        setError("This wallet does not have enough unprotected money for the Already Saved amount.");
        return;
      }
    }
    if (typeof finance?.addSavingsGoal !== "function") {
      setError("Savings Goal saving is not available yet.");
      return;
    }

    const now = new Date().toISOString();
    const payload = {
      id: generateId(),
      title,
      category,
      subcategory,
      target_amount: targetAmount,
      targetAmount,
      saved_amount: savedAmount,
      savedAmount,
      current_amount: savedAmount,
      currentAmount: savedAmount,
      planned_use_date: plannedUseDate || "",
      plannedUseDate: plannedUseDate || "",
      reasons,
      emotional_value: emotionalValue || "joy",
      emotionalValue: emotionalValue || "joy",
      flexibility: "flexible",
      priority: priority || "medium",
      notes,
      wallet_id: selectedWallet?.id || "",
      walletId: selectedWallet?.id || "",
      savingsActivityLog: [],
      savings_activity_log: [],
      activityLog: [],
      activity_log: [],
      created_by: user?.email || null,
      user_email: user?.email || null,
      user_id: user?.id || null,
      created_date: now,
      updated_date: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: "local_only",
      source: "local",
    };

    try {
      setSaving(true);
      await finance.addSavingsGoal(payload);
      await finance.refreshData?.();
      setSaved(true);
      appendExchange("Create Goal", `Done. “${title}” is now a Savings Goal with a ${fmt(targetAmount)} target.`);
      setPhase("saved");
    } catch (nextError) {
      console.error("Unable to save Savings Goal from chat:", nextError);
      setError(nextError?.message || "CLARA could not save this goal yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPhase("title");
    setMessages([
      { role: "assistant", text: greeting },
      { role: "assistant", text: "Choose one real-life target first. Give the money a name, a reason, and a finish line." },
    ]);
    setTitleInput("");
    setTitle("");
    setCategory("");
    setSubcategory("");
    setCustomInput("");
    setTargetInput("");
    setTargetAmount(0);
    setSavedInput("");
    setSavedAmount(0);
    setWalletId("");
    setPlannedUseDate("");
    setReasons(["", "", ""]);
    setReasonInput("");
    setEmotionalValue("joy");
    setPriority("medium");
    setNotesInput("");
    setNotes("");
    setSaving(false);
    setSaved(false);
    setError("");
  };

  const emotionalLabel = EMOTIONAL_VALUES.find((item) => item.value === emotionalValue)?.label || "Joy 😄";
  const priorityLabel = PRIORITIES.find((item) => item.value === priority)?.label || "Medium";

  return (
    <div
      className="fixed inset-0 z-[300] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/98 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-savings-goal-chat="true"
      data-clara-pause-overlay="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,.28),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(43,225,216,.10),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 min-h-16 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,.98),rgba(7,22,48,.98)_56%,rgba(7,31,38,.96))] px-14 shadow-[0_16px_38px_rgba(0,0,0,.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
        <h1 className="absolute inset-0 flex items-center justify-center px-16 text-center text-[17px] font-black tracking-[-.025em] text-white">
          Savings Goal
        </h1>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 active:scale-95"
          aria-label="Close Savings Goal"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={viewportRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-clara-ai-message-viewport="true"
      >
        <div className="flex min-h-full flex-col gap-3" data-clara-ai-message-stack="true">
          {messages.map((message, index) => (
            <Bubble key={`${message.role}-${index}-${message.text}`} role={message.role}>
              {message.text}
            </Bubble>
          ))}

          {phase === "title" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <div className="grid grid-cols-2 gap-2">
                {STARTER_IDEAS.map((idea) => (
                  <ReplyButton key={idea} onClick={() => chooseTitle(idea)}>{idea}</ReplyButton>
                ))}
              </div>
              <Composer
                value={titleInput}
                onChange={setTitleInput}
                onSubmit={submitTitle}
                placeholder="Type your goal..."
              />
            </div>
          ) : null}

          {phase === "category" ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.keys(CATEGORIES).map((item) => (
                <ReplyButton key={item} onClick={() => chooseCategory(item)}>{item}</ReplyButton>
              ))}
              <ReplyButton onClick={() => chooseCategory(OTHER_OPTION)} secondary>Other</ReplyButton>
              <ReplyButton onClick={() => chooseCategory("")} secondary>Skip</ReplyButton>
            </div>
          ) : null}

          {phase === "custom-category" ? (
            <div className="mt-auto pt-3">
              <Composer value={customInput} onChange={setCustomInput} onSubmit={submitCustomCategory} placeholder="Type your category..." />
            </div>
          ) : null}

          {phase === "custom-detail" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={customInput} onChange={setCustomInput} onSubmit={submitCustomDetail} placeholder="Describe it more specifically..." />
              <ReplyButton onClick={skipCustomDetail} secondary>Skip specific detail</ReplyButton>
            </div>
          ) : null}

          {phase === "subcategory" ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {subcategoryOptions.map((item) => (
                <ReplyButton key={item} onClick={() => chooseSubcategory(item)}>{item}</ReplyButton>
              ))}
              <ReplyButton onClick={() => chooseSubcategory(OTHER_OPTION)} secondary>Other</ReplyButton>
              <ReplyButton onClick={() => chooseSubcategory("")} secondary>Skip</ReplyButton>
            </div>
          ) : null}

          {phase === "custom-subcategory" ? (
            <div className="mt-auto pt-3">
              <Composer value={customInput} onChange={setCustomInput} onSubmit={submitCustomSubcategory} placeholder="Type your subcategory..." />
            </div>
          ) : null}

          {phase === "target" ? (
            <div className="mt-auto pt-3">
              <Composer
                value={targetInput}
                onChange={(value) => { setTargetInput(cleanMoney(value)); setError(""); }}
                onSubmit={submitTarget}
                placeholder="Target amount"
                inputMode="decimal"
              />
            </div>
          ) : null}

          {phase === "saved-amount" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer
                value={savedInput}
                onChange={(value) => { setSavedInput(cleanMoney(value)); setError(""); }}
                onSubmit={submitSavedAmount}
                placeholder="Already saved"
                inputMode="decimal"
              />
              <ReplyButton onClick={() => chooseSavedAmount(0, "None yet · ₱0")} secondary>None yet · ₱0</ReplyButton>
            </div>
          ) : null}

          {phase === "wallet" ? (
            <div className="grid gap-2 pt-1">
              {activeWallets.map((wallet) => {
                const available = Math.max(toNumber(walletAvailableBalances[wallet.id]), 0);
                return (
                  <ReplyButton key={wallet.id} onClick={() => chooseWallet(wallet)}>
                    <span className="block">{wallet.name}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-white/48">Available: {fmt(available)}</span>
                  </ReplyButton>
                );
              })}
              {savedAmount <= 0 ? (
                <ReplyButton onClick={chooseNoWallet} secondary>No wallet yet</ReplyButton>
              ) : null}
              {!activeWallets.length ? (
                <div className="rounded-[18px] border border-amber-300/15 bg-amber-400/[0.06] px-4 py-3 text-[11.5px] font-semibold leading-5 text-amber-100/82">
                  No wallets are available.{savedAmount > 0 ? " Create a wallet first before keeping an Already Saved amount." : " You can continue without a wallet because nothing is marked as saved yet."}
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === "date" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <input
                type="date"
                value={plannedUseDate}
                onChange={(event) => setPlannedUseDate(event.target.value)}
                className="min-h-12 rounded-[18px] border border-blue-200/16 bg-[#07142b]/96 px-4 text-[16px] font-bold text-white outline-none"
              />
              <ReplyButton onClick={() => chooseDate(plannedUseDate)} disabled={!plannedUseDate}>Use this date</ReplyButton>
              <ReplyButton onClick={() => chooseDate("")} secondary>No planned date</ReplyButton>
            </div>
          ) : null}

          {reasonIndex >= 0 ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={reasonInput} onChange={setReasonInput} onSubmit={submitReason} placeholder={`Reason ${reasonIndex + 1}`} />
              <ReplyButton onClick={skipReason} secondary>Skip reason {reasonIndex + 1}</ReplyButton>
            </div>
          ) : null}

          {phase === "emotional" ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {EMOTIONAL_VALUES.map((item) => (
                <ReplyButton key={item.value} onClick={() => chooseEmotionalValue(item)}>{item.label}</ReplyButton>
              ))}
            </div>
          ) : null}

          {phase === "priority" ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {PRIORITIES.map((item) => (
                <ReplyButton key={item.value} onClick={() => choosePriority(item)}>{item.label}</ReplyButton>
              ))}
            </div>
          ) : null}

          {phase === "notes" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <Composer value={notesInput} onChange={setNotesInput} onSubmit={submitNotes} placeholder="Add a note..." />
              <ReplyButton onClick={skipNotes} secondary>Skip notes</ReplyButton>
            </div>
          ) : null}

          {phase === "review" ? (
            <div className="mt-auto grid gap-2.5 pt-3">
              <div className="rounded-[22px] border border-cyan-200/14 bg-cyan-200/[.045] p-3.5">
                <div className="mb-3 flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-cyan-100" />
                  <p className="text-[13px] font-black text-white">Savings Goal summary</p>
                </div>
                <div className="grid gap-2">
                  <SummaryRow label="Goal" value={title} />
                  <SummaryRow label="Category" value={category || "None"} />
                  {subcategory ? <SummaryRow label="Detail" value={subcategory} /> : null}
                  <SummaryRow label="Target" value={fmt(targetAmount)} accent />
                  <SummaryRow label="Already saved" value={fmt(savedAmount)} />
                  <SummaryRow label="Saved in" value={selectedWallet?.name || "No wallet yet"} />
                  <SummaryRow label="Planned use" value={formatDate(plannedUseDate)} />
                  <SummaryRow label="Emotional value" value={emotionalLabel} />
                  <SummaryRow label="Priority" value={priorityLabel} />
                </div>
              </div>
              <ReplyButton onClick={saveGoal} disabled={saving}>{saving ? "Creating..." : "Create Goal"}</ReplyButton>
            </div>
          ) : null}

          {phase === "saved" && saved ? (
            <>
              <div className="rounded-[22px] border border-cyan-200/14 bg-cyan-200/[.045] p-4 text-center">
                <PiggyBank className="mx-auto h-6 w-6 text-[#8ffff8]" />
                <p className="mt-2 text-[13px] font-black text-white">Savings Goal created</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/52">{title} · {fmt(targetAmount)} target</p>
              </div>
              <div className="mt-auto grid gap-2.5 pt-3">
                <ReplyButton onClick={reset}>Create another goal</ReplyButton>
                <ReplyButton onClick={onClose} secondary>Done</ReplyButton>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="rounded-[16px] border border-red-300/15 bg-red-500/[.06] px-3.5 py-3 text-[11.5px] font-bold leading-5 text-red-100/88">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
