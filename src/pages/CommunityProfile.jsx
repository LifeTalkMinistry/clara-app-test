import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const PROFILE_MEDIA_BUCKET = "profile-media";

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

export default function CommunityProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState(null);
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
      try {
        setLoading(true);
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!authUser) {
          navigate("/login", { replace: true });
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, display_name, full_name, email, headline, bio, avatar_url, cover_url, created_at"
          )
          .eq("id", authUser.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!mounted) return;

        const safeProfile = data || {};
        const displayName =
          safeProfile.display_name ||
          safeProfile.full_name ||
          authUser.user_metadata?.display_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")?.[0] ||
          "CLARA Member";

        const merged = {
          ...safeProfile,
          id: authUser.id,
          email: safeProfile.email || authUser.email || "",
          display_name: displayName,
          headline: safeProfile.headline || "",
          bio: safeProfile.bio || "",
          avatar_url: safeProfile.avatar_url || "",
          cover_url: safeProfile.cover_url || "",
        };

        setUser(authUser);
        setProfile(merged);
        setForm({
          display_name: merged.display_name,
          headline: merged.headline,
          bio: merged.bio,
          avatar_url: merged.avatar_url,
          cover_url: merged.cover_url,
        });
      } catch (err) {
        console.error("Community profile load failed:", err);
        if (mounted) setError("Unable to load your community profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const liveProfile = editing ? { ...profile, ...form } : profile || {};
  const initials = useMemo(
    () => getInitials(liveProfile.display_name, user?.email),
    [liveProfile.display_name, user?.email]
  );

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (success) setSuccess("");
  };

  const uploadImage = async (file, folder) => {
    if (!file || !user?.id) return;
    setUploading(folder);
    setError("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(PROFILE_MEDIA_BUCKET)
        .getPublicUrl(path);

      updateField(folder === "avatar" ? "avatar_url" : "cover_url", data.publicUrl);
    } catch (err) {
      console.error("Community profile image upload failed:", err);
      setError(err?.message || "Unable to upload that image.");
    } finally {
      setUploading("");
    }
  };

  const startEditing = () => {
    setError("");
    setSuccess("");
    setForm({
      display_name: profile?.display_name || "",
      headline: profile?.headline || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
      cover_url: profile?.cover_url || "",
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError("");
    setSuccess("");
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        display_name: form.display_name.trim() || "CLARA Member",
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim(),
        cover_url: form.cover_url.trim(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: saveError } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select(
          "id, display_name, full_name, email, headline, bio, avatar_url, cover_url, created_at"
        )
        .single();

      if (saveError) throw saveError;

      setProfile((current) => ({ ...current, ...payload, ...(data || {}) }));
      setEditing(false);
      setSuccess("Community profile updated.");
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
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/85 transition hover:bg-white/[0.08]"
            aria-label="Back to Community"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#5eead4]/60">
              CLARA Community
            </p>
            <h1 className="mt-0.5 text-sm font-black text-white">Profile</h1>
          </div>

          {!editing ? (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 px-3 text-xs font-black text-[#ccfbf1] transition hover:bg-[#22c7b8]/15"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelEditing}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/70"
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </header>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0a1a29] shadow-[0_18px_54px_rgba(0,0,0,0.26)]">
          <div
            className="relative h-32 bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_58%,#22c7b8_100%)]"
            style={
              liveProfile.cover_url
                ? {
                    backgroundImage: `linear-gradient(135deg,rgba(6,95,87,.46),rgba(34,199,184,.32)),url("${liveProfile.cover_url}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute right-[-24px] top-[-22px] h-32 w-32 rounded-full bg-white/10" />
          </div>

          <div className="relative px-5 pb-5">
            <div className="-mt-12 flex items-end justify-between gap-3">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#0a1a29] bg-[#123346] text-2xl font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                {liveProfile.avatar_url ? (
                  <img
                    src={liveProfile.avatar_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {editing ? (
                <div className="mb-1 flex gap-2">
                  <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold text-white/80">
                    {uploading === "avatar" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadImage(file, "avatar");
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold text-white/80">
                    {uploading === "cover" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Cover
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadImage(file, "cover");
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <h2 className="text-[28px] font-black leading-none tracking-[-0.035em] text-white">
                {liveProfile.display_name || "CLARA Member"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-[#ccfbf1]/78">
                {liveProfile.headline || "Building better money habits, one decision at a time."}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#99f6e4]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] shadow-[0_0_10px_rgba(45,212,191,.8)]" />
                  Community Member
                </div>
                <span className="text-[11px] font-semibold text-white/38">
                  {formatJoined(profile?.created_at || user?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/8 px-4 py-3 text-sm font-semibold text-[#ccfbf1]">
            <Check className="h-4 w-4" />
            {success}
          </div>
        ) : null}

        {editing ? (
          <section className="mt-4 rounded-[26px] border border-white/10 bg-[#0a1a29] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">
                Edit profile
              </p>
              <h3 className="mt-1 text-lg font-black text-white">How you show up in Community</h3>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-white/55">Display name</span>
                <input
                  value={form.display_name}
                  onChange={(event) => updateField("display_name", event.target.value)}
                  maxLength={50}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#22c7b8]/45 focus:ring-2 focus:ring-[#22c7b8]/10"
                  placeholder="Your name"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-white/55">
                  <Sparkles className="h-3.5 w-3.5 text-[#5eead4]" />
                  Status / headline
                </span>
                <input
                  value={form.headline}
                  onChange={(event) => updateField("headline", event.target.value)}
                  maxLength={100}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#22c7b8]/45 focus:ring-2 focus:ring-[#22c7b8]/10"
                  placeholder="What are you working toward?"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-white/55">Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  maxLength={240}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-[#22c7b8]/45 focus:ring-2 focus:ring-[#22c7b8]/10"
                  placeholder="Tell the community a little about you."
                />
                <span className="mt-1 block text-right text-[10px] font-semibold text-white/28">
                  {form.bio.length}/240
                </span>
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/[0.045] text-sm font-black text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || uploading}
                className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#22c7b8] text-sm font-black text-[#042f2e] shadow-[0_10px_28px_rgba(34,199,184,.18)] transition hover:bg-[#2dd4bf] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-4 space-y-4">
            <section className="rounded-[26px] border border-white/10 bg-[#0a1a29] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">About</p>
              <p className="mt-3 text-sm font-semibold leading-7 text-white/72">
                {profile?.bio || "No bio yet. Add a short introduction so other CLARA members know what you're working toward."}
              </p>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#0a1a29] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">Current focus</p>
                  <p className="mt-2 text-sm font-black text-white">
                    {profile?.headline || "Build better money habits"}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#22c7b8]/16 bg-[#22c7b8]/8 text-[#99f6e4]">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
