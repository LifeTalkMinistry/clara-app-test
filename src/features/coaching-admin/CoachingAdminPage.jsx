import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, LayoutDashboard, RotateCcw, Settings2, UsersRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { coachingRepository } from "./data";
import CoachingOverview from "./components/CoachingOverview";
import CoachingAdminCalendar from "./components/CoachingAdminCalendar";
import AppointmentRequestList from "./components/AppointmentRequestList";
import AppointmentDetail from "./components/AppointmentDetail";
import ScheduleSettings from "./components/ScheduleSettings";
import CoachingAdminDropdownDraft from "./CoachingAdminDropdownDraft";
import {
  AdminButton,
  ConfirmActionDialog,
  MockModeBadge,
} from "./components/CoachingAdminUi";

const tabs = [
  ["overview", "Overview", LayoutDashboard],
  ["calendar", "Calendar", CalendarDays],
  ["requests", "Requests", UsersRound],
  ["settings", "Schedule Settings", Settings2],
];

const confirmationCopy = {
  completed: {
    title: "Mark this session completed?",
    description: "The appointment will move to completed and the slot will remain tied to the historical session record.",
    confirmLabel: "Mark Completed",
    tone: "success",
  },
  cancelled: {
    title: "Cancel this appointment?",
    description: "The appointment will be cancelled and its slot will return to availability unless it was manually blocked.",
    confirmLabel: "Cancel Appointment",
    tone: "danger",
  },
  no_show: {
    title: "Mark this appointment as no-show?",
    description: "Use this only when the confirmed session time has passed and the member did not attend.",
    confirmLabel: "Mark No-Show",
    tone: "danger",
  },
  declined: {
    title: "Decline this request?",
    description: "The request will be marked declined and the requested slot will be released.",
    confirmLabel: "Decline Request",
    tone: "danger",
  },
};

export default function CoachingAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const refresh = () => setRefreshToken((current) => current + 1);

  useEffect(() => {
    let active = true;
    coachingRepository
      .getOverview()
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {
        if (active) toast.error("Unable to load coaching overview.");
      });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const commitStatusChange = async (appointmentId, status) => {
    setBusy(true);
    try {
      await coachingRepository.updateAppointmentStatus(appointmentId, status);
      toast.success("Appointment status updated.");
      refresh();
    } catch (error) {
      toast.error(error.message || "Unable to update the appointment.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const requestStatusChange = (appointmentId, status) => {
    if (confirmationCopy[status]) {
      setPendingAction({ appointmentId, status, ...confirmationCopy[status] });
      return;
    }
    commitStatusChange(appointmentId, status);
  };

  const resetMockData = async () => {
    setBusy(true);
    try {
      await coachingRepository.resetMockData();
      toast.success("Mock coaching data restored to its original seed.");
      setSelectedAppointmentId("");
      setResetOpen(false);
      refresh();
    } catch (error) {
      toast.error(error.message || "Unable to reset mock data.");
    } finally {
      setBusy(false);
    }
  };

  if (location.pathname === "/coaching-mock-preview") {
    return <CoachingAdminDropdownDraft />;
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden px-3 pb-10 sm:px-5 lg:px-7">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-36 top-0 h-96 w-96 rounded-full bg-cyan-400/[0.07] blur-[120px]" />
        <div className="absolute -right-32 top-12 h-[430px] w-[430px] rounded-full bg-violet-500/[0.09] blur-[135px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px]">
        <header className="py-4 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.045] px-3.5 text-[10px] font-black uppercase tracking-[0.11em] text-white/68 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Admin Panel
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <MockModeBadge />
              <AdminButton variant="ghost" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset Mock Coaching Data
              </AdminButton>
            </div>
          </div>

          <div className="mt-5 max-w-3xl">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/65">Private operations environment</p>
            <h1 className="mt-2 text-[30px] font-black tracking-tight text-white sm:text-[40px]">CLARA Coaching Admin</h1>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-300/68 sm:text-[13px]">
              Manage monthly coaching requests, schedules, preparation, and session outcomes.
            </p>
            <p className="mt-2 text-[10px] font-semibold text-violet-100/48">
              Using local demonstration data. Supabase is not connected yet.
            </p>
          </div>
        </header>

        <nav className="sticky top-0 z-30 -mx-3 border-y border-white/[0.06] bg-slate-950/72 px-3 py-2.5 backdrop-blur-2xl sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
          <div className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto">
            {tabs.map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[14px] border px-3.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
                  activeTab === value
                    ? "border-cyan-200/30 bg-cyan-200/[0.12] text-cyan-50"
                    : "border-white/[0.07] bg-white/[0.03] text-white/48 hover:bg-white/[0.06] hover:text-white/75"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </nav>

        <main className="mt-4">
          {activeTab === "overview" ? (
            <CoachingOverview
              overview={overview}
              onOpenAppointment={setSelectedAppointmentId}
              onStatusChange={requestStatusChange}
            />
          ) : null}

          {activeTab === "calendar" ? (
            <CoachingAdminCalendar
              refreshToken={refreshToken}
              onChanged={refresh}
              onOpenAppointment={setSelectedAppointmentId}
              onStatusChange={requestStatusChange}
              onViewRequests={() => setActiveTab("requests")}
            />
          ) : null}

          {activeTab === "requests" ? (
            <AppointmentRequestList
              refreshToken={refreshToken}
              onOpenAppointment={setSelectedAppointmentId}
              onStatusChange={requestStatusChange}
            />
          ) : null}

          {activeTab === "settings" ? (
            <ScheduleSettings refreshToken={refreshToken} onChanged={refresh} />
          ) : null}
        </main>
      </div>

      <AppointmentDetail
        appointmentId={selectedAppointmentId}
        refreshToken={refreshToken}
        onClose={() => setSelectedAppointmentId("")}
        onChanged={refresh}
        onStatusChange={requestStatusChange}
      />

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title}
        description={pendingAction?.description}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone}
        busy={busy}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) {
            commitStatusChange(pendingAction.appointmentId, pendingAction.status);
          }
        }}
      />

      <ConfirmActionDialog
        open={resetOpen}
        title="Reset all mock coaching data?"
        description="This will remove every local admin change, note, status update, availability override, and schedule setting stored under claraCoachingAdminMockState, then restore the original demonstration seed."
        confirmLabel="Reset Mock Data"
        tone="danger"
        busy={busy}
        onClose={() => setResetOpen(false)}
        onConfirm={resetMockData}
      />
    </div>
  );
}
