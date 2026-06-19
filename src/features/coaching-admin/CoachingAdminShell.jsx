import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CoachingOverviewDropdown from "./components/CoachingOverviewDropdown";
import CoachingAdminCalendar from "./components/CoachingAdminCalendar";
import AppointmentRequestList from "./components/AppointmentRequestList";
import AppointmentDetail from "./components/AppointmentDetail";
import ScheduleSettings from "./components/ScheduleSettings";
import { ConfirmActionDialog } from "./components/CoachingAdminUi";
import useCoachingAdminDraft from "./useCoachingAdminDraft";

const views = [
  ["overview", "Overview", LayoutDashboard],
  ["calendar", "Calendar", CalendarDays],
  ["requests", "Requests", UsersRound],
  ["settings", "Schedule Settings", Settings2],
];

export default function CoachingAdminShell() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("overview");
  const state = useCoachingAdminDraft();
  const selectedView = views.find(([value]) => value === activeView) || views[0];
  const SelectedIcon = selectedView[2];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden px-3 pb-8 sm:px-5 lg:px-7">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-20 h-80 w-80 rounded-full bg-cyan-400/[0.06] blur-[110px]" />
        <div className="absolute -right-32 top-6 h-96 w-96 rounded-full bg-violet-500/[0.07] blur-[125px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px]">
        <header className="py-3 sm:py-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="mt-5">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
              Coaching Operations
            </p>
            <h1 className="mt-2 text-[25px] font-black tracking-tight text-white sm:text-[34px]">
              CLARA Coaching Admin
            </h1>
            <p className="mt-1 max-w-xl text-[11px] font-semibold leading-relaxed text-slate-300/58 sm:text-[12px]">
              Manage coaching requests, schedules, preparation, and session outcomes.
            </p>
          </div>
        </header>

        <section className="sticky top-0 z-30 -mx-3 border-y border-white/[0.06] bg-slate-950/80 px-3 py-3 backdrop-blur-2xl sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
          <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/50">
            Workspace
          </label>
          <div className="relative">
            <SelectedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/70" />
            <select
              value={activeView}
              onChange={(event) => setActiveView(event.target.value)}
              className="h-12 w-full appearance-none rounded-[17px] border border-white/[0.09] bg-white/[0.05] pl-10 pr-11 text-[12px] font-black text-white outline-none transition focus:border-cyan-200/30 focus:bg-white/[0.07]"
            >
              {views.map(([value, label]) => (
                <option key={value} value={value} className="bg-slate-950 text-white">
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          </div>
        </section>

        <main className="mt-3">
          {activeView === "overview" && (
            <CoachingOverviewDropdown
              overview={state.overview}
              onOpenAppointment={state.setSelectedAppointmentId}
              onStatusChange={state.requestStatusChange}
            />
          )}

          {activeView === "calendar" && (
            <CoachingAdminCalendar
              refreshToken={state.refreshToken}
              onChanged={state.refresh}
              onOpenAppointment={state.setSelectedAppointmentId}
              onStatusChange={state.requestStatusChange}
              onViewRequests={() => setActiveView("requests")}
            />
          )}

          {activeView === "requests" && (
            <AppointmentRequestList
              refreshToken={state.refreshToken}
              onOpenAppointment={state.setSelectedAppointmentId}
              onStatusChange={state.requestStatusChange}
            />
          )}

          {activeView === "settings" && (
            <ScheduleSettings
              refreshToken={state.refreshToken}
              onChanged={state.refresh}
            />
          )}
        </main>
      </div>

      <AppointmentDetail
        appointmentId={state.selectedAppointmentId}
        refreshToken={state.refreshToken}
        onClose={() => state.setSelectedAppointmentId("")}
        onChanged={state.refresh}
        onStatusChange={state.requestStatusChange}
      />

      <ConfirmActionDialog
        open={Boolean(state.pendingAction)}
        title={state.pendingAction?.title}
        description={state.pendingAction?.description}
        confirmLabel={state.pendingAction?.confirmLabel}
        tone={state.pendingAction?.tone}
        busy={state.busy}
        onClose={() => state.setPendingAction(null)}
        onConfirm={() =>
          state.pendingAction &&
          state.commitStatusChange(
            state.pendingAction.appointmentId,
            state.pendingAction.status
          )
        }
      />
    </div>
  );
}
