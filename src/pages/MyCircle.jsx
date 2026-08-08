import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LockKeyhole,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";

function initialsFor(value) {
  const words = String(value || "CLARA Member")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase()).join("") || "CL";
}

function formatTime(value) {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  const delta = Date.now() - timestamp;
  if (Number.isFinite(delta) && delta >= 0) {
    if (delta < 60_000) return "Just now";
    if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}m`;
    if (delta < 86_400_000) return `${Math.max(1, Math.floor(delta / 3_600_000))}h`;
  }
  try {
    return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function MemberAvatar({ member, size = "md" }) {
  const classes = size === "sm" ? "h-9 w-9 text-[10px]" : "h-11 w-11 text-xs";
  if (member?.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt=""
        className={`${classes} shrink-0 rounded-full border border-[#22c7b8]/25 object-cover`}
      />
    );
  }
  return (
    <div className={`${classes} flex shrink-0 items-center justify-center rounded-full border border-[#22c7b8]/25 bg-[#22c7b8]/10 font-black text-[#ccfbf1]`}>
      {initialsFor(member?.display_name || member?.author_name || member?.full_name)}
    </div>
  );
}

export default function MyCircle() {
  const navigate = useNavigate();
  const token = getStoredBackendToken();
  const backendUser = getStoredBackendUser();
  const currentUserId = backendUser?.id || null;

  const [activeTab, setActiveTab] = useState("circles");
  const [circles, setCircles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [limits, setLimits] = useState({ max_owned_circles: 5, max_people_per_circle: 15 });
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [inviteCircleId, setInviteCircleId] = useState("");
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [circleDetails, setCircleDetails] = useState(null);
  const [circlePost, setCirclePost] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDescription, setNewCircleDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState(null);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    const data = await backendRequest("/api/community/circles", { token });
    const nextCircles = Array.isArray(data?.circles) ? data.circles : [];
    setCircles(nextCircles);
    setInvitations(Array.isArray(data?.invitations) ? data.invitations : []);
    if (data?.limits) setLimits(data.limits);
    setInviteCircleId((current) => {
      const owned = nextCircles.filter((circle) => circle.current_role === "owner");
      if (owned.some((circle) => String(circle.id) === String(current))) return current;
      return owned[0]?.id ? String(owned[0].id) : "";
    });
  }, [token]);

  const loadProfiles = useCallback(async () => {
    if (!token) return;
    const data = await backendRequest("/api/community/profiles", { token });
    setProfiles(Array.isArray(data) ? data : []);
  }, [token]);

  const loadCircle = useCallback(async (circleId, { quiet = false } = {}) => {
    if (!token || !circleId) return;
    if (!quiet) setDetailsLoading(true);
    try {
      const data = await backendRequest(`/api/community/circles/${circleId}`, { token });
      setCircleDetails(data || null);
    } finally {
      if (!quiet) setDetailsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([loadOverview(), loadProfiles()])
      .catch((error) => {
        if (active) setNotice({ type: "error", message: error?.message || "Unable to open My Circle." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadOverview, loadProfiles, token]);

  useEffect(() => {
    if (!selectedCircleId) {
      setCircleDetails(null);
      return;
    }
    loadCircle(selectedCircleId).catch((error) => {
      setNotice({ type: "error", message: error?.message || "Unable to open that circle." });
      setSelectedCircleId(null);
    });
  }, [loadCircle, selectedCircleId]);

  useEffect(() => {
    if (!selectedCircleId || !token) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "hidden") {
        loadCircle(selectedCircleId, { quiet: true }).catch(() => {});
      }
    }, 8000);
    return () => window.clearInterval(interval);
  }, [loadCircle, selectedCircleId, token]);

  const ownedCircles = useMemo(
    () => circles.filter((circle) => circle.current_role === "owner"),
    [circles]
  );

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles
      .filter((profile) => String(profile.id) !== String(currentUserId))
      .filter((profile) => {
        if (!term) return true;
        const haystack = `${profile.display_name || profile.full_name || ""} ${profile.headline || ""}`.toLowerCase();
        return haystack.includes(term);
      });
  }, [currentUserId, profiles, search]);

  const createCircle = async () => {
    const name = newCircleName.trim();
    if (!name || !token || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const created = await backendRequest("/api/community/circles", {
        method: "POST",
        token,
        body: { name, description: newCircleDescription.trim() },
      });
      setNewCircleName("");
      setNewCircleDescription("");
      setCreateOpen(false);
      await loadOverview();
      const circleId = created?.circle?.id || created?.circle?.circle_id || created?.id;
      if (circleId) setSelectedCircleId(circleId);
      setNotice({ type: "success", message: "Your accountability circle is ready." });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to create that circle." });
    } finally {
      setSaving(false);
    }
  };

  const respondToInvite = async (circleId, action) => {
    if (!token) return;
    const key = `invite-${circleId}-${action}`;
    setBusyKey(key);
    setNotice(null);
    try {
      await backendRequest(`/api/community/circles/${circleId}/invite`, {
        method: "PATCH",
        token,
        body: { action },
      });
      await loadOverview();
      if (action === "accept") {
        setNotice({ type: "success", message: "You joined the circle." });
        setSelectedCircleId(circleId);
      }
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to update that invitation." });
    } finally {
      setBusyKey("");
    }
  };

  const invitePerson = async (profile) => {
    if (!token || !inviteCircleId || !profile?.id) return;
    const key = `person-${profile.id}`;
    setBusyKey(key);
    setNotice(null);
    try {
      await backendRequest(`/api/community/circles/${inviteCircleId}/invite`, {
        method: "POST",
        token,
        body: { user_id: profile.id },
      });
      await loadOverview();
      setNotice({
        type: "success",
        message: `Invitation sent to ${profile.display_name || profile.full_name || "that CLARA member"}.`,
      });
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to send that invitation." });
    } finally {
      setBusyKey("");
    }
  };

  const publishCirclePost = async () => {
    const text = circlePost.trim();
    if (!text || !token || !selectedCircleId || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      await backendRequest(`/api/community/circles/${selectedCircleId}/posts`, {
        method: "POST",
        token,
        body: { body: text },
      });
      setCirclePost("");
      await Promise.all([loadCircle(selectedCircleId), loadOverview()]);
    } catch (error) {
      setNotice({ type: "error", message: error?.message || "Unable to share that check-in." });
    } finally {
      setSaving(false);
    }
  };

  const openFindPeopleForCircle = (circleId) => {
    setInviteCircleId(String(circleId));
    setSelectedCircleId(null);
    setActiveTab("people");
    setSearch("");
  };

  if (!token || !currentUserId) {
    return (
      <div className="min-h-full bg-[#06111f] px-6 py-16 text-center text-white">
        <LockKeyhole className="mx-auto h-8 w-8 text-[#5eead4]/55" />
        <h1 className="mt-4 text-xl font-black">My Circle needs your CLARA account.</h1>
        <p className="mt-2 text-sm text-white/45">Sign in again to reconnect your private accountability spaces.</p>
      </div>
    );
  }

  if (selectedCircleId) {
    const circle = circleDetails?.circle;
    const members = Array.isArray(circleDetails?.members) ? circleDetails.members : [];
    const posts = Array.isArray(circleDetails?.posts) ? circleDetails.posts : [];
    const isOwner = circle?.current_role === "owner";

    return (
      <div className="min-h-full bg-[#06111f] pb-[calc(env(safe-area-inset-bottom)+32px)] text-white">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06111f]/96 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <button type="button" onClick={() => setSelectedCircleId(null)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/80" aria-label="Back to My Circle">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5eead4]/55">My Circle</p>
              <h1 className="truncate text-[17px] font-black">{circle?.name || "Accountability Circle"}</h1>
            </div>
            <div className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#22c7b8]/20 bg-[#22c7b8]/[0.07] px-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#99f6e4]">
              <LockKeyhole className="h-3.5 w-3.5" /> Private
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl space-y-4 px-3 pt-4 sm:px-5">
          {notice ? (
            <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${notice.type === "error" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-[#22c7b8]/20 bg-[#22c7b8]/10 text-[#ccfbf1]"}`}>
              {notice.message}
            </div>
          ) : null}

          {detailsLoading || !circle ? (
            <div className="py-20 text-center text-sm font-semibold text-white/40">Opening your circle...</div>
          ) : (
            <>
              <section className="rounded-[26px] border border-white/10 bg-[#0a1a29] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Accountability space</p>
                    <h2 className="mt-1 text-xl font-black">{circle.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {circle.description || "A private place to check in, share wins, and keep each other accountable with money."}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-[#99f6e4]">
                    <UsersRound className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                  <div className="flex -space-x-2">
                    {members.slice(0, 6).map((member) => (
                      <div key={member.id} className="rounded-full bg-[#06111f] p-0.5"><MemberAvatar member={member} size="sm" /></div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-white/38">{members.length} / {circleDetails?.limits?.max_people_per_circle || limits.max_people_per_circle} people</p>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Circle members</p>
                    <p className="mt-1 text-[11px] text-white/38">Only these people can see what is shared here.</p>
                  </div>
                  {isOwner ? (
                    <button type="button" onClick={() => openFindPeopleForCircle(circle.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 text-[10px] font-black text-[#ccfbf1]">
                      <UserPlus className="h-3.5 w-3.5" /> Invite
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {members.map((member) => (
                    <button key={member.id} type="button" onClick={() => navigate(String(member.id) === String(currentUserId) ? "/profile" : `/users/${member.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left">
                      <MemberAvatar member={member} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-white">{member.display_name}</p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">{member.role === "owner" ? "Circle owner" : "Accountability member"}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/20" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#22c7b8]/16 bg-[#0a1a29] p-4">
                <div className="flex items-center gap-2 text-[#99f6e4]"><ShieldCheck className="h-4 w-4" /><p className="text-[10px] font-black uppercase tracking-[0.16em]">Private check-in</p></div>
                <textarea
                  value={circlePost}
                  onChange={(event) => setCirclePost(event.target.value)}
                  rows={3}
                  maxLength={3000}
                  placeholder="Share a win, temptation, savings update, or ask your circle to keep you accountable..."
                  className="mt-3 min-h-[92px] w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/28 focus:border-[#22c7b8]/30"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] leading-4 text-white/30">Nothing is shared from your CLARA financial records automatically.</p>
                  <button type="button" onClick={publishCirclePost} disabled={!circlePost.trim() || saving} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#22c7b8] px-4 text-xs font-black text-[#042f2e] disabled:opacity-40">
                    <Send className="h-3.5 w-3.5" /> {saving ? "Sharing..." : "Share"}
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Circle feed</p>
                  <h3 className="mt-1 text-lg font-black">Keep each other moving</h3>
                </div>
                {posts.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 px-5 py-12 text-center">
                    <UsersRound className="mx-auto h-7 w-7 text-[#5eead4]/35" />
                    <p className="mt-3 text-sm font-black">Start the accountability.</p>
                    <p className="mt-1 text-xs leading-5 text-white/38">Share the first check-in so everyone knows what you are working toward.</p>
                  </div>
                ) : posts.map((post) => (
                  <article key={post.id} className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar member={{ display_name: post.author_name, avatar_url: post.author_avatar_url }} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black">{post.author_name}</p>
                        <p className="mt-0.5 text-[9px] font-semibold text-white/30">{formatTime(post.created_at)}</p>
                      </div>
                      <span className="rounded-full border border-[#22c7b8]/15 bg-[#22c7b8]/[0.06] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#99f6e4]">Circle</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/82">{post.body}</p>
                  </article>
                ))}
              </section>
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#06111f] pb-[calc(env(safe-area-inset-bottom)+32px)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06111f]/96 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button type="button" onClick={() => navigate("/community")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/80" aria-label="Back to Community">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5eead4]/55">Accountability</p>
            <h1 className="text-[18px] font-black tracking-[-0.02em]">My Circle</h1>
          </div>
          <button type="button" onClick={() => setCreateOpen((open) => !open)} className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 text-[10px] font-black text-[#ccfbf1]">
            {createOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {createOpen ? "Close" : "New"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-3 pt-4 sm:px-5">
        <section className="overflow-hidden rounded-[28px] border border-[#22c7b8]/16 bg-[radial-gradient(circle_at_top_left,rgba(34,199,184,0.14),transparent_40%),#0a1a29] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-[#99f6e4]"><UsersRound className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-black">You do not have to manage money alone.</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">Build a small private circle of people who want to save, stay disciplined, and keep each other accountable.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-black/10 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#5eead4]/60" />
            <p className="text-[10px] leading-4 text-white/38">Your balances, income, budgets, and expenses are never shared automatically. You choose what your circle sees.</p>
          </div>
        </section>

        {notice ? (
          <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${notice.type === "error" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-[#22c7b8]/20 bg-[#22c7b8]/10 text-[#ccfbf1]"}`}>
            {notice.message}
          </div>
        ) : null}

        {createOpen ? (
          <section className="rounded-[24px] border border-[#22c7b8]/18 bg-[#0a1a29] p-4">
            <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[#99f6e4]" /><h3 className="text-sm font-black">Create an accountability circle</h3></div>
            <p className="mt-1 text-[11px] leading-5 text-white/38">Keep it personal. Each circle supports up to {limits.max_people_per_circle || 15} people.</p>
            <input value={newCircleName} onChange={(event) => setNewCircleName(event.target.value)} maxLength={80} placeholder="Circle name — e.g. Budget Buddies" className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-[#22c7b8]/30" />
            <textarea value={newCircleDescription} onChange={(event) => setNewCircleDescription(event.target.value)} maxLength={300} rows={3} placeholder="What are you helping each other achieve?" className="mt-3 min-h-[82px] w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#22c7b8]/30" />
            <button type="button" onClick={createCircle} disabled={!newCircleName.trim() || saving} className="mt-3 h-11 w-full rounded-2xl bg-[#22c7b8] text-sm font-black text-[#042f2e] disabled:opacity-40">{saving ? "Creating..." : "Create My Circle"}</button>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-white/10 bg-[#081725] p-1.5">
          <button type="button" onClick={() => setActiveTab("circles")} className={`h-10 rounded-[13px] text-xs font-black transition ${activeTab === "circles" ? "bg-[#22c7b8] text-[#042f2e]" : "text-white/45"}`}>My Circles</button>
          <button type="button" onClick={() => setActiveTab("people")} className={`h-10 rounded-[13px] text-xs font-black transition ${activeTab === "people" ? "bg-[#22c7b8] text-[#042f2e]" : "text-white/45"}`}>Find People</button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm font-semibold text-white/40">Loading your accountability spaces...</div>
        ) : activeTab === "circles" ? (
          <div className="space-y-4">
            {invitations.length > 0 ? (
              <section className="space-y-2">
                <div className="px-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Invitations</p></div>
                {invitations.map((invite) => (
                  <div key={invite.circle_id} className="rounded-[22px] border border-[#22c7b8]/18 bg-[#22c7b8]/[0.06] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/10 text-[#99f6e4]"><UsersRound className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{invite.name}</p><p className="mt-1 text-[11px] leading-5 text-white/42">{invite.inviter_name || "A CLARA member"} invited you to join this private accountability circle.</p></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => respondToInvite(invite.circle_id, "decline")} disabled={busyKey.startsWith(`invite-${invite.circle_id}`)} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white/55">Decline</button>
                      <button type="button" onClick={() => respondToInvite(invite.circle_id, "accept")} disabled={busyKey.startsWith(`invite-${invite.circle_id}`)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#22c7b8] text-xs font-black text-[#042f2e]"><Check className="h-3.5 w-3.5" /> Join</button>
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="space-y-2">
              <div className="flex items-end justify-between gap-3 px-1"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Your spaces</p><h3 className="mt-1 text-lg font-black">Accountability circles</h3></div><p className="text-[10px] font-bold text-white/30">{ownedCircles.length}/{limits.max_owned_circles || 5} created</p></div>
              {circles.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 px-5 py-12 text-center">
                  <UsersRound className="mx-auto h-8 w-8 text-[#5eead4]/35" />
                  <p className="mt-3 text-sm font-black">Build your first circle.</p>
                  <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-5 text-white/38">Invite people you trust and create your own small money-accountability team.</p>
                  <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#22c7b8] px-4 text-xs font-black text-[#042f2e]"><Plus className="h-3.5 w-3.5" /> Create a Circle</button>
                </div>
              ) : circles.map((circle) => (
                <button key={circle.id} type="button" onClick={() => setSelectedCircleId(circle.id)} className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-[#0a1a29] p-4 text-left transition active:scale-[0.99]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/10 text-[#99f6e4]"><UsersRound className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-black">{circle.name}</p>{circle.current_role === "owner" ? <span className="shrink-0 rounded-full border border-[#22c7b8]/15 bg-[#22c7b8]/[0.06] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-[#99f6e4]">You lead</span> : null}</div><p className="mt-1 truncate text-[11px] text-white/38">{circle.description || `${circle.member_count || 1} people keeping each other accountable`}</p><p className="mt-1 text-[9px] font-semibold text-white/25">{circle.member_count || 1} member{Number(circle.member_count) === 1 ? "" : "s"}{circle.pending_count > 0 && circle.current_role === "owner" ? ` · ${circle.pending_count} invited` : ""}</p></div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/22" />
                </button>
              ))}
            </section>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-[#0a1a29] p-4">
              <div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#5eead4]/55" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search CLARA members..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/28" /></div>
              <div className="mt-3 border-t border-white/[0.07] pt-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/30">Invite to</p>
                {ownedCircles.length ? (
                  <select value={inviteCircleId} onChange={(event) => setInviteCircleId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#071725] px-3 text-xs font-black text-white outline-none">
                    {ownedCircles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
                  </select>
                ) : (
                  <button type="button" onClick={() => { setActiveTab("circles"); setCreateOpen(true); }} className="h-11 w-full rounded-xl border border-[#22c7b8]/18 bg-[#22c7b8]/[0.07] text-xs font-black text-[#ccfbf1]">Create a circle before inviting people</button>
                )}
              </div>
            </div>

            <div className="px-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">CLARA members</p><p className="mt-1 text-xs text-white/35">Find people you trust. They choose whether to accept your invitation.</p></div>

            {filteredProfiles.length === 0 ? (
              <div className="py-14 text-center text-sm font-semibold text-white/35">No members found.</div>
            ) : filteredProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-[#0a1a29] p-3">
                <button type="button" onClick={() => navigate(`/users/${profile.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <MemberAvatar member={{ display_name: profile.display_name || profile.full_name, avatar_url: profile.avatar_url }} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{profile.display_name || profile.full_name || "CLARA Member"}</p><p className="mt-1 truncate text-[10px] text-white/35">{profile.headline || "Building better money habits with CLARA"}</p></div>
                </button>
                <button type="button" onClick={() => invitePerson(profile)} disabled={!inviteCircleId || busyKey === `person-${profile.id}`} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 text-[10px] font-black text-[#ccfbf1] disabled:opacity-35"><UserPlus className="h-3.5 w-3.5" /> {busyKey === `person-${profile.id}` ? "Sending" : "Invite"}</button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
