import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCommittedFeatureAccess } from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import { CHECK_IN_STEPS, INITIAL_ANSWERS } from "@/components/coaching/sessionOptions";
import SessionCheckIn from "@/components/coaching/SessionCheckIn";
import { buildCalendarDays, MonthCalendar, TimePicker } from "@/components/coaching/SessionCalendar";
import { LoadingPanel, SessionIntro } from "@/components/coaching/SessionShared";
import { AppointmentStatus, RequestSuccess } from "@/components/coaching/SessionStatus";
import { getStoredBackendToken } from "@/lib/clara-backend-client";
import { cancelCoachingAppointment, createCoachingAppointment, fetchCoachingAvailability, fetchMyCoachingAppointments, requestCoachingReschedule } from "@/lib/coaching-backend-client";
import { COACHING_POLL_INTERVAL_MS, clearUnsentCoachingDraft, formatDateKey, formatMonthKey, groupSlotsByDate, normalizeAvailability, pickRelevantAppointment, readUnsentCoachingDraft, saveUnsentCoachingDraft } from "@/lib/welcome-session-schedule";

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function monthDateFromKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1, 12);
}

export default function WelcomeSession() {
  const navigate = useNavigate();
  const coachingIconLastTapRef = useRef(0);
  const hasCommittedAccess = useCommittedFeatureAccess();
  const isCommitmentSession = !hasCommittedAccess;
  const sessionType = isCommitmentSession ? "committed_first_session" : "monthly_coaching";
  const token = getStoredBackendToken();

  const [slots, setSlots] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState("calendar");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [monthIndex, setMonthIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [allowRebooking, setAllowRebooking] = useState(false);

  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);
  const monthOptions = useMemo(() => [...new Set(slots.map((slot) => slot.monthKey))].sort(), [slots]);
  const selectedMonthKey = monthOptions[monthIndex] || monthOptions[0] || formatMonthKey(new Date());
  const selectedMonth = monthDateFromKey(selectedMonthKey);
  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonthKey]);
  const selectedDateSlots = slotsByDate.get(selectedDateKey) || [];
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;
  const selectedDateLabel = selectedDateSlots[0]?.fullDateLabel || "Choose a date";
  const todayKey = formatDateKey(new Date());

  const loadAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const from = formatDateKey(new Date());
      const payload = await fetchCoachingAvailability({ from, to: addDays(from, 90), sessionType, token });
      const normalized = normalizeAvailability(payload);
      setSlots(normalized);
      setLoadError("");
      const draft = readUnsentCoachingDraft(sessionType);
      if (draft) {
        setAnswers({ ...INITIAL_ANSWERS, ...(draft.answers || {}) });
        setRecoveredDraft(true);
        const matching = normalized.find((slot) => slot.id === draft.slotId);
        if (matching) {
          setSelectedDateKey(matching.dateKey);
          setSelectedSlotId(matching.id);
          setQuestionIndex(CHECK_IN_STEPS.length);
          setView("checkin");
          const index = [...new Set(normalized.map((slot) => slot.monthKey))].sort().indexOf(matching.monthKey);
          if (index >= 0) setMonthIndex(index);
        }
      }
    } catch (error) {
      setLoadError(error.message || "CLARA could not load real availability.");
      setSlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [sessionType, token]);

  const loadAppointment = useCallback(async () => {
    try {
      const appointments = await fetchMyCoachingAppointments(token);
      const relevant = pickRelevantAppointment(appointments, sessionType);
      setAppointment(relevant);
      if (relevant?.status && relevant.status !== "requested") setJustSubmitted(false);
      return appointments;
    } catch (error) {
      setLoadError(error.message || "CLARA could not load your appointment status.");
      return [];
    }
  }, [sessionType, token]);

  const refreshAll = useCallback(async () => {
    const appointments = await loadAppointment();
    const relevant = pickRelevantAppointment(appointments, sessionType);
    if (!relevant || ["declined", "cancelled"].includes(relevant.status)) await loadAvailability();
  }, [loadAppointment, loadAvailability, sessionType]);

  useEffect(() => {
    let active = true;
    (async () => { setLoading(true); await refreshAll(); if (active) setLoading(false); })();
    return () => { active = false; };
  }, [refreshAll]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") loadAppointment(); }, COACHING_POLL_INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === "visible") refreshAll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [loadAppointment, refreshAll]);

  useEffect(() => { if (monthIndex >= monthOptions.length && monthOptions.length) setMonthIndex(0); }, [monthIndex, monthOptions.length]);

  const resetToCalendar = () => { setView("calendar"); setSelectedDateKey(""); setSelectedSlotId(""); setQuestionIndex(0); setSubmitError(""); };
  const handleDateSelect = (dateKey) => { if (!(slotsByDate.get(dateKey) || []).length) return; setSelectedDateKey(dateKey); setSelectedSlotId(""); setView("times"); };

  const handleSubmit = async () => {
    if (!selectedSlot || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const created = await createCoachingAppointment({ slotId: selectedSlot.id, sessionType, answers, token });
      clearUnsentCoachingDraft(sessionType);
      setRecoveredDraft(false);
      setAppointment(created);
      setAllowRebooking(false);
      setJustSubmitted(true);
      setView("success");
    } catch (error) {
      if (error?.status === 409) {
        const collisionMessage = "That schedule was just taken. Please choose another available time.";
        setSubmitError(collisionMessage);
        resetToCalendar();
        await loadAvailability();
        setLoadError(collisionMessage);
      } else {
        saveUnsentCoachingDraft(sessionType, { slotId: selectedSlot.id, answers });
        setRecoveredDraft(true);
        setSubmitError(`${error.message || "The request could not be submitted."} This is an unsent draft and is not booked yet.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment || !window.confirm("Cancel this session request?")) return;
    setIsActioning(true);
    try { setAppointment(await cancelCoachingAppointment(appointment.id, token)); setAllowRebooking(false); setJustSubmitted(false); await loadAvailability(); }
    catch (error) { setLoadError(error.message || "The session could not be cancelled."); }
    finally { setIsActioning(false); }
  };

  const handleRequestReschedule = async () => {
    if (!appointment || !window.confirm("Ask Max to review a reschedule request?")) return;
    setIsActioning(true);
    try { setAppointment(await requestCoachingReschedule(appointment.id, token)); setJustSubmitted(false); }
    catch (error) { setLoadError(error.message || "The reschedule request could not be sent."); }
    finally { setIsActioning(false); }
  };

  const handleBookAgain = async () => { setAllowRebooking(true); setJustSubmitted(false); resetToCalendar(); await loadAvailability(); };
  const handleIconTap = () => { const now = Date.now(); if (now - coachingIconLastTapRef.current > 0 && now - coachingIconLastTapRef.current <= 450) { coachingIconLastTapRef.current = 0; navigate("/coaching-mock-preview"); return; } coachingIconLastTapRef.current = now; };
  const showScheduler = !appointment || allowRebooking;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden px-3 pb-3 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0"><div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-[100px]" /><div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-violet-500/[0.10] blur-[110px]" /></div>
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-3 py-2.5 sm:py-4"><button type="button" onClick={() => navigate("/dashboard")} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.045] px-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/72"><ArrowLeft className="h-4 w-4" />Home</button><button type="button" onClick={refreshAll} className="inline-flex h-10 items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-3 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/75"><RefreshCw className="h-3.5 w-3.5" />Refresh status</button></header>
        <section className="relative overflow-hidden rounded-[30px] border border-cyan-100/15 bg-[linear-gradient(145deg,rgba(5,28,46,0.94),rgba(8,18,43,0.95)_50%,rgba(35,14,72,0.94))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.14),transparent_38%),radial-gradient(circle_at_100%_10%,rgba(139,92,246,0.16),transparent_40%)]" /><div className="relative">{loading ? <LoadingPanel label="Loading your appointment…" /> : null}{!loading && justSubmitted && appointment && view === "success" ? <RequestSuccess appointment={appointment} onHome={() => navigate("/dashboard")} /> : null}{!loading && !justSubmitted && appointment && !showScheduler ? <AppointmentStatus appointment={appointment} onCancel={handleCancel} onRequestReschedule={handleRequestReschedule} onBookAgain={handleBookAgain} isActioning={isActioning} /> : null}{!loading && showScheduler && view === "calendar" ? <SessionIntro isCommitmentSession={isCommitmentSession} onIconTap={handleIconTap} /> : null}{!loading && showScheduler && view === "times" ? <TimePicker selectedDateLabel={selectedDateLabel} selectedDateSlots={selectedDateSlots} selectedSlotId={selectedSlotId} onSelectSlot={setSelectedSlotId} onReset={resetToCalendar} onContinue={() => { if (selectedSlot) { setQuestionIndex(0); setView("checkin"); } }} /> : null}{!loading && showScheduler && view === "checkin" && selectedSlot ? <SessionCheckIn selectedSlot={selectedSlot} questionIndex={questionIndex} answers={answers} onAnswer={(key, value) => setAnswers((current) => ({ ...current, [key]: value }))} onBack={() => { if (questionIndex > 0) setQuestionIndex((value) => value - 1); else setView("times"); }} onNext={() => setQuestionIndex((value) => Math.min(value + 1, CHECK_IN_STEPS.length))} onSubmit={handleSubmit} isSubmitting={isSubmitting} submitError={submitError} recoveredDraft={recoveredDraft} /> : null}</div></section>
        {!loading && loadError ? <div className="mt-3 rounded-[20px] border border-rose-200/15 bg-rose-300/[0.06] px-4 py-3 text-[10px] font-semibold text-rose-100/80">{loadError}</div> : null}
        {!loading && showScheduler && view === "calendar" ? <MonthCalendar slots={slots} slotsByDate={slotsByDate} availabilityLoading={availabilityLoading} loadError={loadError} loadAvailability={loadAvailability} monthIndex={monthIndex} setMonthIndex={setMonthIndex} monthOptions={monthOptions} selectedMonthKey={selectedMonthKey} selectedMonth={selectedMonth} calendarDays={calendarDays} todayKey={todayKey} onDateSelect={handleDateSelect} isCommitmentSession={isCommitmentSession} /> : null}
      </div>
    </div>
  );
}
