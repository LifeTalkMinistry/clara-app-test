import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  MessageCircle,
  Pencil,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";

function getInitials(name = "", email = "") {
  const source = String(name || "").trim() || String(email || "").trim() || "CL";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatJoined(value) {
  if (!value) return "CLARA member";
  try {
    return `Member since ${new Intl.DateTimeFormat("en-PH", {
      month: "short",
      year: "numeric",
    }).format(new Date(value))}`;
  } catch {
    return "CLARA member";
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read that image."));
    };
    image.src = url;
  });
}

async function compressImage(file, kind) {
  if (!file?.type?.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Please choose an image smaller than 8 MB.");

  const image = await loadImage(file);
  const maxWidth = kind === "cover" ? 1400 : 900;
  const maxHeight = kind === "cover" ? 700 : 900;
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.76);
}

export default function CommunityProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const backendUser = getStoredBackendUser();
  const token = getStoredBackendToken();
  const targetId = userId || backendUser?.id || null;
  const isOwnProfile = !userId || String(userId) === String(backendUser?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    display_name: "",
    headline: "",
    bio: "",
    avatar_url: "",
    cover_url: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token || !targetId) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        setLoading(true);
        setError("");
        const path = isOwnProfile
          ? "/api/community/profile/me"
          : `/api/community/profiles/${encodeURIComponent(targetId)}`;
        const data = await backendRequest(path, { token });
        if (!mounted) return;
        setProfile(data);
        setForm({
          display_name: data?.display_name || data?.full_name || "CLARA Member",
          headline: data?.headline || "",
          bio: data?.bio || "",
          avatar_url: data?.avatar_url || "",
          cover_url: data?.cover_url || "",
        });
      } catch (err) {
        console.error("Community profile load failed:", err);
        if (mounted) setError(err?.message || "Unable to load this community profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isOwnProfile, navigate, targetId, token]);

  const liveProfile = editing ? { ...profile, ...form } : profile || {};
  const initials = useMemo(
    () => getInitials(liveProfile.display_name || liveProfile.full_name, liveProfile.email),
    [liveProfile.display_name, liveProfile.full_name, liveProfile.email]
  );

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess("");
  };

  const handleImage = async (file, kind) => {
    if (!file) return;
    try {
      setUploading(kind);
      setError("");
      const dataUrl = await compressImage(file, kind);
      updateField(kind === "avatar" ? "avatar_url" : "cover_url", dataUrl);
    } catch (err) {
      setError(err?.message || "Unable to prepare that image.");
    } finally {
      setUploading("");
    }
  };

  const startEditing = () => {
    setForm({
      display_name: profile?.display_name || profile?.full_name || "CLARA Member",
      headline: profile?.headline || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
      cover_url: profile?.cover_url || "",
    });
    setError("");
    setSuccess("");
    setEditing(true);
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      const updated = await backendRequest("/api/community/profile/me", {
        method: "PATCH",
        token,
        timeoutMs: 20000,
        body: {
          display_name: form.display_name.trim() || "CLARA Member",
          headline: form.headline.trim(),
          bio: form.bio.trim(),
          avatar_url: form.avatar_url,
          cover_url: form.cover_url,
        },
      });
      setProfile(updated);
      setEditing(false);
      setSuccess("Community profile updated online.");
    } catch (err) {
      console.error("Community profile save failed:", err);
      setError(err?.message || "Unable to save your profile right now.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06111f] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#22c7b8]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06111f] text-white">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/community")} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/85" aria-label="Back to Community">
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#5eead4]/60">CLARA Community</p>
            <h1 className="mt-0.5 text-sm font-black text-white">Profile</h1>
          </div>

          {isOwnProfile ? (
            editing ? (
              <button type="button" onClick={() => setEditing(false)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/70">
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={startEditing} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 px-3 text-xs font-black text-[#ccfbf1]">
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )
          ) : (
            <button type="button" onClick={() => navigate(`/messages?userId=${encodeURIComponent(targetId)}`)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 px-3 text-xs font-black text-[#ccfbf1]">
              <MessageCircle className="h-4 w-4" /> Message
            </button>
          )}
        </header>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0a1a29] shadow-[0_18px_54px_rgba(0,0,0,0.26)]">
          <div className="relative h-32 bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_58%,#22c7b8_100%)]" style={liveProfile.cover_url ? { backgroundImage: `linear-gradient(135deg,rgba(6,95,87,.42),rgba(34,199,184,.24)),url("${liveProfile.cover_url}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
            <div className="absolute right-[-24px] top-[-22px] h-32 w-32 rounded-full bg-white/10" />
          </div>

          <div className="relative px-5 pb-5">
            <div className="-mt-12 flex items-end justify-between gap-3">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#0a1a29] bg-[#123346] text-2xl font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                {liveProfile.avatar_url ? <img src={liveProfile.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : initials}
              </div>
              {editing ? (
                <div className="mb-1 flex gap-2">
                  <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold text-white/80">
                    {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { handleImage(event.target.files?.[0], "avatar"); event.target.value = ""; }} />
                  </label>
                  <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold text-white/80">
                    {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Cover
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { handleImage(event.target.files?.[0], "cover"); event.target.value = ""; }} />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <h2 className="text-[28px] font-black leading-none tracking-[-0.035em] text-white">{liveProfile.display_name || liveProfile.full_name || "CLARA Member"}</h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-[#ccfbf1]/78">{liveProfile.headline || "Building better money habits, one decision at a time."}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#99f6e4]"><span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" /> Community Member</div>
                <span className="text-[11px] font-semibold text-white/38">{formatJoined(profile?.created_at)}</span>
              </div>
            </div>
          </div>
        </section>

        {error ? <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {success ? <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/8 px-4 py-3 text-sm font-semibold text-[#ccfbf1]"><Check className="h-4 w-4" />{success}</div> : null}

        {editing ? (
          <section className="mt-4 rounded-[26px] border border-white/10 bg-[#0a1a29] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">Edit profile</p>
            <div className="mt-4 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold text-white/55">Display name</span><input value={form.display_name} onChange={(event) => updateField("display_name", event.target.value)} maxLength={60} className="h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold text-white outline-none focus:border-[#22c7b8]/45" /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-white/55">Status / headline</span><input value={form.headline} onChange={(event) => updateField("headline", event.target.value)} maxLength={120} className="h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold text-white outline-none focus:border-[#22c7b8]/45" placeholder="What are you working toward?" /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-white/55">Bio</span><textarea rows={5} value={form.bio} onChange={(event) => updateField("bio", event.target.value)} maxLength={800} className="w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none focus:border-[#22c7b8]/45" placeholder="Tell the community a little about yourself." /></label>
              <button type="button" onClick={saveProfile} disabled={saving || uploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c7b8] font-black text-[#042f2e] disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving online..." : "Save Profile"}
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-4 space-y-3">
            <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">About</p><p className="mt-3 text-sm font-semibold leading-7 text-white/72">{profile?.bio || "No bio yet. This member can add a short introduction from Edit Profile."}</p></section>
            <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">Community identity</p><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-white/42">Display name</span><span className="text-right font-bold text-white">{profile?.display_name || profile?.full_name || "CLARA Member"}</span></div><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-white/42">Account</span><span className="text-right font-semibold text-white/65">Online CLARA member</span></div></section>
          </div>
        )}
      </div>
    </div>
  );
}
