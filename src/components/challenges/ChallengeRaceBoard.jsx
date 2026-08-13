import { useEffect, useMemo, useState } from "react";
import { Check, Flame, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";

const FILTERS = [
  { key: "still_in", label: "Still In" },
  { key: "finished", label: "Finished" },
  { key: "out", label: "Out" },
];

function initials(name = "") {
  const parts = String(name || "CLARA Member").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CL";
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

function monthLabel(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return "Current Race";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

function statusMeta(participant) {
  if (participant.status === "finished") {
    return { label: "Finished", icon: Medal, ring: "border-[#facc15]", text: "text-[#fde68a]" };
  }
  if (participant.status === "out") {
    return { label: "Out", icon: ShieldAlert, ring: "border-white/15", text: "text-white/35" };
  }
  if (participant.status === "needs_check_in") {
    return { label: "Needs today", icon: Flame, ring: "border-[#facc15]/65", text: "text-[#fde68a]" };
  }
  return { label: "Checked in", icon: Check, ring: "border-[#22c7b8]", text: "text-[#99f6e4]" };
}

function Competitor({ participant }) {
  const meta = statusMeta(participant);
  const Icon = meta.icon;
  return (
    <div className={`rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-3 ${participant.status === "out" ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${meta.ring} bg-[#10243a] text-xs font-black text-white`}>
          <span>{initials(participant.displayName)}</span>
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          ) : null}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#06111f] bg-[#0a1a29]">
            <Icon className={`h-2.5 w-2.5 ${meta.text}`} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black text-white">{participant.displayName}</p>
          <p className={`mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${meta.text}`}>{meta.label}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/28">Day</p>
          <p className="text-base font-black text-white">{participant.day || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeRaceBoard() {
  const [activeFilter, setActiveFilter] = useState("still_in");
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    const token = getStoredBackendToken();
    if (!token) {
      setState({ loading: false, data: null, error: "Sign in to view the live Race Board." });
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await backendRequest("/api/users/me/challenge-race-board", { token });
        if (!cancelled) setState({ loading: false, data, error: "" });
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, data: null, error: "Race Board is temporarily unavailable." });
        }
      }
    };

    load();
    const intervalId = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const participants = Array.isArray(state.data?.participants) ? state.data.participants : [];
  const summary = state.data?.summary || { started: 0, stillIn: 0, finished: 0, out: 0 };

  const filtered = useMemo(() => {
    if (activeFilter === "finished") return participants.filter((item) => item.status === "finished");
    if (activeFilter === "out") return participants.filter((item) => item.status === "out");
    return participants.filter((item) => item.status === "checked_in" || item.status === "needs_check_in");
  }, [activeFilter, participants]);

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-[#22c7b8]/18 bg-[#091727] p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#22c7b8]/[0.08] blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-[#99f6e4]">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#5eead4]/60">CLARA Race Board</p>
              <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-white">{monthLabel(state.data?.raceMonth)}</h3>
              <p className="mt-1 text-[10px] font-semibold leading-4 text-white/40">See who is still standing with you. This is a finish-together race, not a leaderboard.</p>
            </div>
          </div>
          <Trophy className="mt-1 h-5 w-5 shrink-0 text-[#facc15]/65" />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.025] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-white/28">Started</p>
            <p className="mt-1 text-base font-black text-white">{summary.started || 0}</p>
          </div>
          <div className="rounded-[15px] border border-[#22c7b8]/12 bg-[#22c7b8]/[0.04] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#99f6e4]/45">Still In</p>
            <p className="mt-1 text-base font-black text-[#99f6e4]">{summary.stillIn || 0}</p>
          </div>
          <div className="rounded-[15px] border border-[#facc15]/12 bg-[#facc15]/[0.035] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#fde68a]/45">Finished</p>
            <p className="mt-1 text-base font-black text-[#fde68a]">{summary.finished || 0}</p>
          </div>
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.02] px-2 py-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-white/24">Out</p>
            <p className="mt-1 text-base font-black text-white/45">{summary.out || 0}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-[16px] border border-white/[0.07] bg-[#061321] p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`h-9 rounded-[12px] text-[9px] font-black transition ${activeFilter === filter.key ? "bg-white/[0.08] text-white" : "text-white/35"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {state.loading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-[74px] animate-pulse rounded-[20px] border border-white/[0.05] bg-white/[0.025]" />)}
            </div>
          ) : state.error ? (
            <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-5 text-center text-[11px] font-semibold text-white/38">{state.error}</div>
          ) : filtered.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((participant) => <Competitor key={participant.userId} participant={participant} />)}
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-5 text-center">
              <p className="text-[11px] font-black text-white/55">No one here yet.</p>
              <p className="mt-1 text-[9px] font-semibold text-white/28">This board updates automatically as the race changes.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
