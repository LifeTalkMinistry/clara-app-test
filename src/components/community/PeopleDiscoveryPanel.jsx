import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  ChevronRight,
  Clock3,
  Search,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { backendRequest } from "@/lib/clara-backend-client";

function initialsFor(value) {
  return String(value || "CLARA Member")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "CL";
}

function PersonAvatar({ person, size = "md" }) {
  const classes = size === "lg" ? "h-16 w-16 text-base" : "h-11 w-11 text-xs";
  if (person?.avatar_url) {
    return (
      <img
        src={person.avatar_url}
        alt=""
        className={`${classes} shrink-0 rounded-full border border-[#22c7b8]/25 object-cover`}
      />
    );
  }
  return (
    <div className={`${classes} flex shrink-0 items-center justify-center rounded-full border border-[#22c7b8]/25 bg-[#22c7b8]/10 font-black text-[#ccfbf1]`}>
      {initialsFor(person?.display_name || person?.full_name)}
    </div>
  );
}

function deriveFocusTags(person) {
  const text = `${person?.headline || ""} ${person?.bio || ""}`.toLowerCase();
  const tags = [];
  if (text.includes("saving") || text.includes("save")) tags.push("Saving");
  if (text.includes("budget")) tags.push("Budgeting");
  if (text.includes("debt")) tags.push("Debt-free");
  if (text.includes("emergency")) tags.push("Emergency Fund");
  if (text.includes("spend")) tags.push("Spending Discipline");
  return tags.length ? tags.slice(0, 3) : ["Money Discipline"];
}

function relationshipLabel(person) {
  switch (person?.relationship_status) {
    case "connected": return "Connected";
    case "incoming": return "Wants to connect";
    case "outgoing": return "Request sent";
    default: return "Open to connect";
  }
}

function RelationshipBadge({ person }) {
  const status = person?.relationship_status || "none";
  const classes = status === "connected"
    ? "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-200"
    : status === "incoming"
      ? "border-cyan-300/18 bg-cyan-400/[0.08] text-cyan-100"
      : status === "outgoing"
        ? "border-white/10 bg-white/[0.04] text-white/42"
        : "border-[#22c7b8]/14 bg-[#22c7b8]/[0.05] text-[#99f6e4]";
  return (
    <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.11em] ${classes}`}>
      {relationshipLabel(person)}
    </span>
  );
}

export default function PeopleDiscoveryPanel({
  token,
  currentUserId,
  ownedCircles = [],
  inviteCircleId,
  setInviteCircleId,
  onNeedCircle,
  navigate,
  onNotice,
  onCirclesChanged,
}) {
  const [people, setPeople] = useState([]);
  const [mode, setMode] = useState("discover");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [connectionsAvailable, setConnectionsAvailable] = useState(true);

  const loadPeople = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await backendRequest("/api/community/people", { token });
      setPeople(Array.isArray(data?.people) ? data.people : []);
      setConnectionsAvailable(true);
    } catch (error) {
      try {
        const fallback = await backendRequest("/api/community/profiles", { token });
        setPeople(
          (Array.isArray(fallback) ? fallback : [])
            .filter((profile) => String(profile.id) !== String(currentUserId))
            .map((profile) => ({
              ...profile,
              relationship_status: "none",
              mutual_circle_count: 0,
            }))
        );
        setConnectionsAvailable(false);
      } catch {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [currentUserId, token]);

  useEffect(() => {
    loadPeople().catch((error) => {
      onNotice?.({ type: "error", message: error?.message || "Unable to load CLARA People." });
    });
  }, [loadPeople, onNotice]);

  useEffect(() => {
    if (!token || !selectedPerson?.id || selectedPerson?.cover_url) return undefined;

    let cancelled = false;
    backendRequest(`/api/community/profiles/${encodeURIComponent(selectedPerson.id)}`, { token })
      .then((profile) => {
        if (cancelled || !profile) return;
        setSelectedPerson((current) => {
          if (!current || String(current.id) !== String(selectedPerson.id)) return current;
          return {
            ...current,
            cover_url: profile.cover_url || "",
            avatar_url: profile.avatar_url || current.avatar_url || "",
            headline: profile.headline || current.headline || "",
            bio: profile.bio || current.bio || "",
          };
        });
      })
      .catch(() => {
        // A missing cover must never block the People preview itself.
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPerson?.cover_url, selectedPerson?.id, token]);

  const counts = useMemo(() => ({
    connections: people.filter((person) => person.relationship_status === "connected").length,
    requests: people.filter((person) => person.relationship_status === "incoming").length,
  }), [people]);

  const visiblePeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    return people.filter((person) => {
      const status = person.relationship_status || "none";
      if (mode === "connections" && status !== "connected") return false;
      if (mode === "requests" && status !== "incoming" && status !== "outgoing") return false;
      if (mode === "discover" && status === "connected") return false;
      if (!term) return true;
      const haystack = `${person.display_name || person.full_name || ""} ${person.headline || ""} ${person.bio || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [mode, people, search]);

  const refreshPerson = useCallback(async (personId) => {
    await loadPeople();
    setSelectedPerson((current) => {
      if (!current || String(current.id) !== String(personId)) return current;
      return null;
    });
  }, [loadPeople]);

  const sendConnection = async (person) => {
    if (!connectionsAvailable) {
      onNotice?.({ type: "error", message: "Connections are finishing setup on the CLARA server. Please try again shortly." });
      return;
    }
    const key = `connect-${person.id}`;
    setBusyKey(key);
    try {
      await backendRequest(`/api/community/connections/${person.id}`, { method: "POST", token, body: {} });
      onNotice?.({ type: "success", message: `Connection request sent to ${person.display_name || person.full_name || "that member"}.` });
      await refreshPerson(person.id);
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to send that connection request." });
    } finally {
      setBusyKey("");
    }
  };

  const respondConnection = async (person, action) => {
    const key = `${action}-${person.id}`;
    setBusyKey(key);
    try {
      await backendRequest(`/api/community/connections/${person.id}`, {
        method: "PATCH",
        token,
        body: { action },
      });
      onNotice?.({
        type: "success",
        message: action === "accept"
          ? `You and ${person.display_name || person.full_name || "that member"} are now connected.`
          : "Connection request declined.",
      });
      await refreshPerson(person.id);
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to update that connection request." });
    } finally {
      setBusyKey("");
    }
  };

  const removeConnection = async (person) => {
    const key = `remove-${person.id}`;
    setBusyKey(key);
    try {
      await backendRequest(`/api/community/connections/${person.id}`, { method: "DELETE", token });
      onNotice?.({ type: "success", message: "Connection removed." });
      await refreshPerson(person.id);
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to remove that connection." });
    } finally {
      setBusyKey("");
    }
  };

  const blockPerson = async (person) => {
    if (typeof window !== "undefined" && !window.confirm(`Block ${person.display_name || person.full_name || "this member"}? They will no longer appear in your CLARA People discovery.`)) return;
    const key = `block-${person.id}`;
    setBusyKey(key);
    try {
      await backendRequest(`/api/community/blocks/${person.id}`, { method: "POST", token, body: {} });
      onNotice?.({ type: "success", message: "Member blocked." });
      setSelectedPerson(null);
      await loadPeople();
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to block that member." });
    } finally {
      setBusyKey("");
    }
  };

  const invitePerson = async (person) => {
    if (!inviteCircleId) {
      onNeedCircle?.();
      return;
    }
    const key = `invite-${person.id}`;
    setBusyKey(key);
    try {
      await backendRequest(`/api/community/circles/${inviteCircleId}/invite`, {
        method: "POST",
        token,
        body: { user_id: person.id },
      });
      onNotice?.({ type: "success", message: `${person.display_name || person.full_name || "That member"} was invited to your circle.` });
      await onCirclesChanged?.();
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to send that circle invitation." });
    } finally {
      setBusyKey("");
    }
  };

  const primaryAction = (person, compact = false) => {
    const status = person.relationship_status || "none";
    if (status === "incoming") {
      return (
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={() => respondConnection(person, "decline")} disabled={busyKey.endsWith(`-${person.id}`)} className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[9px] font-black text-white/48 disabled:opacity-40">Decline</button>
          <button type="button" onClick={() => respondConnection(person, "accept")} disabled={busyKey.endsWith(`-${person.id}`)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#22c7b8] px-3 text-[9px] font-black text-[#042f2e] disabled:opacity-40"><Check className="h-3 w-3" /> Accept</button>
        </div>
      );
    }
    if (status === "outgoing") {
      return (
        <button type="button" onClick={() => removeConnection(person)} disabled={busyKey === `remove-${person.id}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[9px] font-black text-white/42 disabled:opacity-40"><Clock3 className="h-3 w-3" /> Requested</button>
      );
    }
    if (status === "connected") {
      return (
        <button type="button" onClick={() => invitePerson(person)} disabled={busyKey === `invite-${person.id}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 text-[9px] font-black text-[#ccfbf1] disabled:opacity-40"><UsersRound className="h-3 w-3" /> {compact ? "Invite" : "Invite to Circle"}</button>
      );
    }
    return (
      <button type="button" onClick={() => sendConnection(person)} disabled={busyKey === `connect-${person.id}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 text-[9px] font-black text-[#ccfbf1] disabled:opacity-40"><UserPlus className="h-3 w-3" /> Connect</button>
    );
  };

  return (
    <section className="space-y-3">
      <div className="rounded-[22px] border border-white/10 bg-[#0a1a29] p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#071725] px-3">
          <Search className="h-4 w-4 text-[#5eead4]/48" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people by name or goal..." className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/26" />
          {search ? <button type="button" onClick={() => setSearch("")} className="text-white/30"><X className="h-4 w-4" /></button> : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.06] bg-black/10 p-1">
          {[
            ["discover", "Discover", null],
            ["connections", "Connections", counts.connections],
            ["requests", "Requests", counts.requests],
          ].map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setMode(key)} className={`relative h-9 rounded-xl text-[9px] font-black transition ${mode === key ? "border border-[#22c7b8]/20 bg-[#22c7b8]/12 text-[#ccfbf1]" : "text-white/34"}`}>
              {label}{Number(count) > 0 ? <span className="ml-1 rounded-full bg-[#22c7b8] px-1.5 py-0.5 text-[7px] text-[#042f2e]">{count}</span> : null}
            </button>
          ))}
        </div>

        {mode === "connections" ? (
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/28">Invite connections to</p>
            {ownedCircles.length ? (
              <select value={inviteCircleId} onChange={(event) => setInviteCircleId?.(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#071725] px-3 text-[10px] font-black text-white outline-none">
                {ownedCircles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
              </select>
            ) : (
              <button type="button" onClick={onNeedCircle} className="h-10 w-full rounded-xl border border-[#22c7b8]/16 bg-[#22c7b8]/[0.06] text-[10px] font-black text-[#ccfbf1]">Create a circle first</button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">CLARA People</p>
          <p className="mt-1 text-xs text-white/35">
            {mode === "connections" ? "People you have chosen to keep close." : mode === "requests" ? "Connection requests waiting on either side." : "Find people who can become part of your accountability system."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-14 text-center text-sm font-semibold text-white/35">Finding CLARA People...</div>
      ) : visiblePeople.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/10 px-5 py-12 text-center">
          <UsersRound className="mx-auto h-7 w-7 text-[#5eead4]/30" />
          <p className="mt-3 text-sm font-black">Nothing here yet.</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-5 text-white/35">{mode === "connections" ? "Connect with someone first, then invite them into a circle." : mode === "requests" ? "New connection requests will appear here." : "Try a different search."}</p>
        </div>
      ) : visiblePeople.map((person) => (
        <article key={person.id} className="rounded-[22px] border border-white/10 bg-[#0a1a29] p-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelectedPerson(person)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <PersonAvatar person={person} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-black">{person.display_name || person.full_name || "CLARA Member"}</p>
                  {Number(person.mutual_circle_count) > 0 ? <span className="shrink-0 text-[8px] font-black text-[#5eead4]/45">{person.mutual_circle_count} mutual</span> : null}
                </div>
                <p className="mt-1 truncate text-[10px] text-white/35">{person.headline || "Building better money habits with CLARA"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {deriveFocusTags(person).map((tag) => <span key={tag} className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white/30">{tag}</span>)}
                </div>
              </div>
            </button>
            <div className="hidden sm:block">{primaryAction(person, true)}</div>
            <button type="button" onClick={() => setSelectedPerson(person)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/22 sm:hidden" aria-label="Open person"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.055] pt-3 sm:hidden">
            <RelationshipBadge person={person} />
            {primaryAction(person, true)}
          </div>
        </article>
      ))}

      {selectedPerson ? (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPerson(null); }}>
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/12 bg-[#081725] shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
            <div className="relative overflow-hidden border-b border-white/[0.07] bg-[#0a1a29]">
              <div className="relative h-28 w-full overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(34,199,184,0.28),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.26),transparent_44%),#0a1a29] sm:h-32">
                {selectedPerson.cover_url ? (
                  <img
                    src={selectedPerson.cover_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-100"
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a1a29]/75 to-transparent" />
                <button type="button" onClick={() => setSelectedPerson(null)} className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#06111f]/68 text-white/80 shadow-lg backdrop-blur-md"><X className="h-4 w-4" /></button>
              </div>

              <div className="relative px-5 pb-5">
                <div className="relative z-10 -mt-8 inline-flex rounded-full border-4 border-[#0a1a29] bg-[#0a1a29] shadow-[0_14px_30px_rgba(0,0,0,0.32)]">
                  <PersonAvatar person={selectedPerson} size="lg" />
                </div>
                <h3 className="mt-3 text-xl font-black">{selectedPerson.display_name || selectedPerson.full_name || "CLARA Member"}</h3>
                <p className="mt-1 text-sm leading-6 text-white/45">{selectedPerson.headline || "Building better money habits with CLARA"}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{deriveFocusTags(selectedPerson).map((tag) => <span key={tag} className="rounded-full border border-[#22c7b8]/14 bg-[#22c7b8]/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#99f6e4]">{tag}</span>)}</div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/28">Relationship</p>
                  <p className="mt-1 text-xs font-black text-white/78">{relationshipLabel(selectedPerson)}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/28">Mutual circles</p>
                  <p className="mt-1 text-xs font-black text-white/78">{Number(selectedPerson.mutual_circle_count) || 0}</p>
                </div>
              </div>

              <div>{primaryAction(selectedPerson)}</div>
              <button type="button" onClick={() => navigate?.(`/users/${selectedPerson.id}`)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.035] text-xs font-black text-white/62">View CLARA profile</button>

              <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                {selectedPerson.relationship_status === "connected" ? (
                  <button type="button" onClick={() => removeConnection(selectedPerson)} className="text-[9px] font-black text-white/30 hover:text-white/55">Remove connection</button>
                ) : <span />}
                <button type="button" onClick={() => blockPerson(selectedPerson)} disabled={busyKey === `block-${selectedPerson.id}`} className="inline-flex items-center gap-1 text-[9px] font-black text-rose-200/45 hover:text-rose-200/70 disabled:opacity-40"><Ban className="h-3 w-3" /> Block</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
