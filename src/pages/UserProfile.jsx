import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  CalendarDays,
  User,
  Pencil,
  Lock,
  Image as ImageIcon,
  LayoutGrid,
  FileText,
  Sparkles,
  Phone,
  Save,
  X,
  Camera,
  Plus,
  Trash2,
  Upload,
  Loader2,
  HandHelping,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "updates", label: "Updates", icon: Sparkles },
  { key: "photos", label: "Photos", icon: ImageIcon },
  { key: "about", label: "About", icon: FileText },
];

const INVALID_ROUTE_IDS = new Set([
  "",
  "undefined",
  "null",
  "profile",
  "account",
  "me",
  "self",
]);

const PROFILE_MEDIA_BUCKET = "profile-media";

const normalizeRouteId = (value) => {
  const safe = String(value || "").trim().toLowerCase();
  if (!safe || INVALID_ROUTE_IDS.has(safe)) return null;
  return String(value).trim();
};

const getInitials = (name = "", email = "") => {
  const source = String(name || "").trim() || String(email || "").trim() || "U";
  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "Not available";

  try {
    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
};

function EmptyPanel({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 text-center shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white/70">
        <Icon className="h-7 w-7" />
      </div>

      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-white/55">
        {description}
      </p>

      {action ? (
        <div className="mt-4 inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
          {action}
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="truncate text-[15px] font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = "text",
}) {
  const sharedClassName =
    "w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/40 focus:bg-white/[0.06]";

  return (
    <div className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className={`${sharedClassName} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={sharedClassName}
        />
      )}
    </div>
  );
}

const buildFallbackProfileFromAuth = (user) => {
  if (!user) return null;

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    display_name:
      metadata.display_name ||
      metadata.name ||
      user.email?.split("@")?.[0] ||
      "",
    email: user.email || "",
    phone: metadata.phone || user.phone || "",
    created_at: user.created_at || null,
    bio: metadata.bio || "",
    headline: metadata.headline || "",
    location: metadata.location || "",
    website: metadata.website || "",
    profile_updates: [],
    profile_photos: [],
    avatar_url: metadata.avatar_url || "",
    cover_url: metadata.cover_url || "",
  };
};

const normalizePhotos = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeUpdates = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return { text: item, created_at: new Date().toISOString() };
        }
        if (item && typeof item === "object") {
          return {
            text: String(item.text || "").trim(),
            created_at: item.created_at || new Date().toISOString(),
          };
        }
        return null;
      })
      .filter((item) => item?.text);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        text: line,
        created_at: new Date().toISOString(),
      }));
  }

  return [];
};

export default function UserProfile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [resolvedProfileId, setResolvedProfileId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState(null);

  const [partnershipStatus, setPartnershipStatus] = useState("idle");
  const [partnershipRequestId, setPartnershipRequestId] = useState(null);
  const [partnershipLoading, setPartnershipLoading] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    bio: "",
    headline: "",
    location: "",
    website: "",
    avatar_url: "",
    cover_url: "",
    profile_updates: [],
    profile_photos: [],
  });

  const hydrateForm = useCallback((data) => {
    setForm({
      display_name: data?.display_name || "",
      email: data?.email || "",
      phone: data?.phone || "",
      bio: data?.bio || "",
      headline: data?.headline || "",
      location: data?.location || "",
      website: data?.website || "",
      avatar_url: data?.avatar_url || "",
      cover_url: data?.cover_url || "",
      profile_updates: normalizeUpdates(data?.profile_updates),
      profile_photos: normalizePhotos(data?.profile_photos),
    });
  }, []);

  const resetPartnershipState = useCallback(() => {
    setPartnershipStatus("idle");
    setPartnershipRequestId(null);
  }, []);

  const resolvePartnershipState = useCallback(
    async (viewerId, targetId) => {
      if (!viewerId || !targetId || String(viewerId) === String(targetId)) {
        resetPartnershipState();
        return;
      }

      try {
        const { data: partnershipData, error: partnershipError } = await supabase
          .from("partnerships")
          .select("id, user_one, user_two")
          .or(
            `and(user_one.eq.${viewerId},user_two.eq.${targetId}),and(user_one.eq.${targetId},user_two.eq.${viewerId})`
          )
          .limit(1);

        if (
          !partnershipError &&
          Array.isArray(partnershipData) &&
          partnershipData.length > 0
        ) {
          setPartnershipStatus("partnered");
          setPartnershipRequestId(null);
          return;
        }

        const { data: sentRequest, error: sentError } = await supabase
          .from("partnership_requests")
          .select("id, status")
          .eq("sender_id", viewerId)
          .eq("receiver_id", targetId)
          .in("status", ["pending", "accepted"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sentError && sentRequest) {
          if (sentRequest.status === "accepted") {
            setPartnershipStatus("partnered");
            setPartnershipRequestId(sentRequest.id);
            return;
          }

          setPartnershipStatus("pending_sent");
          setPartnershipRequestId(sentRequest.id);
          return;
        }

        const { data: receivedRequest, error: receivedError } = await supabase
          .from("partnership_requests")
          .select("id, status")
          .eq("sender_id", targetId)
          .eq("receiver_id", viewerId)
          .in("status", ["pending", "accepted"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!receivedError && receivedRequest) {
          if (receivedRequest.status === "accepted") {
            setPartnershipStatus("partnered");
            setPartnershipRequestId(receivedRequest.id);
            return;
          }

          setPartnershipStatus("pending_received");
          setPartnershipRequestId(receivedRequest.id);
          return;
        }

        resetPartnershipState();
      } catch (error) {
        console.error("Failed to resolve partnership status:", error);
        resetPartnershipState();
      }
    },
    [resetPartnershipState]
  );

  const fetchUser = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authId = user?.id || null;
      const normalizedRouteId = normalizeRouteId(id);
      const targetId = normalizedRouteId || authId || null;

      setCurrentUserId(authId);
      setResolvedProfileId(targetId);

      if (!targetId) {
        setProfile(null);
        resetPartnershipState();
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            display_name,
            email,
            phone,
            created_at,
            bio,
            headline,
            location,
            website,
            avatar_url,
            cover_url,
            profile_updates,
            profile_photos
          `
        )
        .eq("id", targetId)
        .maybeSingle();

      if (error) {
        console.error("User profile fetch error:", error);

        if (authId && targetId === authId) {
          const fallback = buildFallbackProfileFromAuth(user);
          setProfile(fallback);
          hydrateForm(fallback);
        } else {
          setProfile(null);
        }

        await resolvePartnershipState(authId, targetId);
        return;
      }

      if (data) {
        const merged = {
          ...data,
          display_name:
            data.display_name ||
            user?.user_metadata?.display_name ||
            data.email ||
            "User",
          email: data.email || user?.email || "",
          bio: data.bio || "",
          headline: data.headline || "",
          location: data.location || "",
          website: data.website || "",
          avatar_url: data.avatar_url || "",
          cover_url: data.cover_url || "",
          profile_updates: normalizeUpdates(data.profile_updates),
          profile_photos: normalizePhotos(data.profile_photos),
        };

        setProfile(merged);
        hydrateForm(merged);
        await resolvePartnershipState(authId, targetId);
        return;
      }

      if (authId && targetId === authId) {
        const fallback = buildFallbackProfileFromAuth(user);
        setProfile(fallback);
        hydrateForm(fallback);
      } else {
        setProfile(null);
      }

      await resolvePartnershipState(authId, targetId);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setProfile(null);
      resetPartnershipState();
    } finally {
      setLoading(false);
    }
  }, [hydrateForm, id, resetPartnershipState, resolvePartnershipState]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    setActiveTab("overview");
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess("");
  }, [resolvedProfileId]);

  useEffect(() => {
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess("");
    if (profile) hydrateForm(profile);
  }, [activeTab, hydrateForm, profile]);

  const isOwnProfile = useMemo(() => {
    return Boolean(
      currentUserId &&
        resolvedProfileId &&
        String(currentUserId) === String(resolvedProfileId)
    );
  }, [currentUserId, resolvedProfileId]);

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.email?.split("@")?.[0] || "User";
  }, [profile]);

  const liveDisplayName = useMemo(() => {
    return form.display_name || form.email?.split("@")?.[0] || "User";
  }, [form]);

  const initials = useMemo(() => {
    return getInitials(
      isEditing ? liveDisplayName : displayName,
      form.email || profile?.email
    );
  }, [displayName, form.email, isEditing, liveDisplayName, profile?.email]);

  const joinedLabel = useMemo(() => {
    return formatDate(profile?.created_at);
  }, [profile?.created_at]);

  const visibleUpdates = useMemo(() => {
    return isEditing ? form.profile_updates : profile?.profile_updates || [];
  }, [form.profile_updates, isEditing, profile?.profile_updates]);

  const visiblePhotos = useMemo(() => {
    return isEditing ? form.profile_photos : profile?.profile_photos || [];
  }, [form.profile_photos, isEditing, profile?.profile_photos]);

  const startEditing = () => {
    setSaveError("");
    setSaveSuccess("");
    hydrateForm(profile || {});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setSaveError("");
    setSaveSuccess("");
    hydrateForm(profile || {});
    setIsEditing(false);
  };

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const addUpdateItem = () => {
    setForm((prev) => ({
      ...prev,
      profile_updates: [
        { text: "", created_at: new Date().toISOString() },
        ...prev.profile_updates,
      ],
    }));
  };

  const updateUpdateItem = (index, value) => {
    setForm((prev) => ({
      ...prev,
      profile_updates: prev.profile_updates.map((item, itemIndex) =>
        itemIndex === index ? { ...item, text: value } : item
      ),
    }));
  };

  const removeUpdateItem = (index) => {
    setForm((prev) => ({
      ...prev,
      profile_updates: prev.profile_updates.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const addPhotoItem = () => {
    setForm((prev) => ({
      ...prev,
      profile_photos: [...prev.profile_photos, ""],
    }));
  };

  const updatePhotoItem = (index, value) => {
    setForm((prev) => ({
      ...prev,
      profile_photos: prev.profile_photos.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }));
  };

  const removePhotoItem = (index) => {
    setForm((prev) => ({
      ...prev,
      profile_photos: prev.profile_photos.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const uploadImageToSupabase = async (file, folder = "general") => {
    if (!file || !resolvedProfileId) {
      throw new Error("Missing file or user id.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${resolvedProfileId}/${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaveError("");
    setSaveSuccess("");
    setUploadingAvatar(true);

    try {
      const publicUrl = await uploadImageToSupabase(file, "avatar");
      updateField("avatar_url", publicUrl);
    } catch (err) {
      console.error("Avatar upload error:", err);
      setSaveError(err?.message || "Failed to upload profile photo.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaveError("");
    setSaveSuccess("");
    setUploadingCover(true);

    try {
      const publicUrl = await uploadImageToSupabase(file, "cover");
      updateField("cover_url", publicUrl);
    } catch (err) {
      console.error("Cover upload error:", err);
      setSaveError(err?.message || "Failed to upload cover photo.");
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaveError("");
    setSaveSuccess("");
    setUploadingGalleryIndex(index);

    try {
      const publicUrl = await uploadImageToSupabase(file, "gallery");
      updatePhotoItem(index, publicUrl);
    } catch (err) {
      console.error("Gallery upload error:", err);
      setSaveError(err?.message || "Failed to upload gallery photo.");
    } finally {
      setUploadingGalleryIndex(null);
      event.target.value = "";
    }
  };

  const saveCurrentTab = async () => {
    if (!isOwnProfile || !resolvedProfileId) return;

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      let payload = {};

      if (activeTab === "overview") {
        payload = {
          display_name: form.display_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          headline: form.headline.trim(),
        };
      }

      if (activeTab === "about") {
        payload = {
          bio: form.bio.trim(),
          location: form.location.trim(),
          website: form.website.trim(),
        };
      }

      if (activeTab === "updates") {
        payload = {
          profile_updates: form.profile_updates
            .map((item) => ({
              text: String(item.text || "").trim(),
              created_at: item.created_at || new Date().toISOString(),
            }))
            .filter((item) => item.text),
        };
      }

      if (activeTab === "photos") {
        payload = {
          avatar_url: form.avatar_url.trim(),
          cover_url: form.cover_url.trim(),
          profile_photos: form.profile_photos
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        };
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", resolvedProfileId)
        .select(
          `
            id,
            display_name,
            email,
            phone,
            created_at,
            bio,
            headline,
            location,
            website,
            avatar_url,
            cover_url,
            profile_updates,
            profile_photos
          `
        )
        .single();

      if (error) throw error;

      const merged = {
        ...profile,
        ...payload,
        ...(data || {}),
        profile_updates: normalizeUpdates(
          data?.profile_updates ?? payload.profile_updates
        ),
        profile_photos: normalizePhotos(
          data?.profile_photos ?? payload.profile_photos
        ),
      };

      setProfile(merged);
      hydrateForm(merged);
      setIsEditing(false);
      setSaveSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to save profile tab:", err);
      setSaveError(err?.message || "Unable to save profile right now.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!isOwnProfile) {
      navigate(`/messages?userId=${resolvedProfileId}`);
      return;
    }

    if (isEditing) {
      saveCurrentTab();
      return;
    }

    startEditing();
  };

  const sendPartnershipRequest = async () => {
    if (!currentUserId || !resolvedProfileId || isOwnProfile || partnershipLoading) return;

    setPartnershipLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const { data: existingPending, error: existingPendingError } = await supabase
        .from("partnership_requests")
        .select("id")
        .eq("sender_id", currentUserId)
        .eq("receiver_id", resolvedProfileId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (existingPendingError) throw existingPendingError;

      if (existingPending?.id) {
        setPartnershipStatus("pending_sent");
        setPartnershipRequestId(existingPending.id);
        return;
      }

      const { data: insertedRequest, error: insertError } = await supabase
        .from("partnership_requests")
        .insert({
          sender_id: currentUserId,
          receiver_id: resolvedProfileId,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      setPartnershipStatus("pending_sent");
      setPartnershipRequestId(insertedRequest?.id || null);
      setSaveSuccess("Partnership request sent.");
    } catch (error) {
      console.error("Failed to send partnership request:", error);
      setSaveError(
        error?.message || "Unable to send partnership request right now."
      );
    } finally {
      setPartnershipLoading(false);
    }
  };

  const acceptPartnershipRequest = async () => {
    if (!partnershipRequestId || !currentUserId || !resolvedProfileId || partnershipLoading) {
      return;
    }

    setPartnershipLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("partnership_requests")
        .update({ status: "accepted" })
        .eq("id", partnershipRequestId);

      if (updateError) throw updateError;

      const { data: existingPartnership, error: existingPartnershipError } =
        await supabase
          .from("partnerships")
          .select("id")
          .or(
            `and(user_one.eq.${currentUserId},user_two.eq.${resolvedProfileId}),and(user_one.eq.${resolvedProfileId},user_two.eq.${currentUserId})`
          )
          .limit(1);

      if (existingPartnershipError) throw existingPartnershipError;

      if (!Array.isArray(existingPartnership) || existingPartnership.length === 0) {
        const { error: partnershipInsertError } = await supabase
          .from("partnerships")
          .insert({
            user_one: currentUserId,
            user_two: resolvedProfileId,
          });

        if (partnershipInsertError) throw partnershipInsertError;
      }

      setPartnershipStatus("partnered");
      setSaveSuccess("Partnership accepted.");
    } catch (error) {
      console.error("Failed to accept partnership request:", error);
      setSaveError(
        error?.message || "Unable to accept partnership request right now."
      );
    } finally {
      setPartnershipLoading(false);
    }
  };

  const declinePartnershipRequest = async () => {
    if (!partnershipRequestId || partnershipLoading) return;

    setPartnershipLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const { error } = await supabase
        .from("partnership_requests")
        .update({ status: "declined" })
        .eq("id", partnershipRequestId);

      if (error) throw error;

      setPartnershipStatus("idle");
      setPartnershipRequestId(null);
      setSaveSuccess("Partnership request declined.");
    } catch (error) {
      console.error("Failed to decline partnership request:", error);
      setSaveError(
        error?.message || "Unable to decline partnership request right now."
      );
    } finally {
      setPartnershipLoading(false);
    }
  };

  const renderOverviewTab = () => {
    if (!isEditing) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <InfoCard
              icon={User}
              label="Name"
              value={profile?.display_name || "Not available"}
            />
            <InfoCard
              icon={Mail}
              label="Email"
              value={profile?.email || "Not available"}
            />
            <InfoCard
              icon={Phone}
              label="Phone"
              value={profile?.phone || "Not available"}
            />
            <InfoCard
              icon={Sparkles}
              label="Headline"
              value={profile?.headline || "No headline yet"}
            />
            <InfoCard icon={CalendarDays} label="Joined" value={joinedLabel} />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <EditableField
          label="Name"
          value={form.display_name}
          onChange={(value) => updateField("display_name", value)}
          placeholder="Enter your name"
        />
        <EditableField
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) => updateField("email", value)}
          placeholder="Enter email"
        />
        <EditableField
          label="Phone"
          value={form.phone}
          onChange={(value) => updateField("phone", value)}
          placeholder="Enter phone"
        />
        <EditableField
          label="Headline"
          value={form.headline}
          onChange={(value) => updateField("headline", value)}
          placeholder="Short profile headline"
        />
        <InfoCard icon={CalendarDays} label="Joined" value={joinedLabel} />
      </div>
    );
  };

  const renderUpdatesTab = () => {
    if (!isOwnProfile && (!profile?.profile_updates || profile.profile_updates.length === 0)) {
      return (
        <EmptyPanel
          icon={Lock}
          title="Private updates"
          description="Only approved CLARA Partners can view updates here."
          action="Partner-only visibility"
        />
      );
    }

    if (!isEditing && (!visibleUpdates || visibleUpdates.length === 0)) {
      return (
        <EmptyPanel
          icon={Sparkles}
          title="No updates yet"
          description={
            isOwnProfile
              ? "Your CLARA updates can appear here."
              : "No profile updates available yet."
          }
          action={isOwnProfile ? "Ready for your future posts" : null}
        />
      );
    }

    if (!isEditing) {
      return (
        <div className="space-y-3">
          {visibleUpdates.map((item, index) => (
            <div
              key={`${item.created_at}-${index}`}
              className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center gap-2 text-[11px] text-emerald-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{formatDate(item.created_at)}</span>
              </div>
              <p className="text-sm leading-6 text-white/85">{item.text}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={addUpdateItem}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
        >
          <Plus size={16} />
          Add Update
        </button>

        {form.profile_updates.length === 0 ? (
          <EmptyPanel
            icon={Sparkles}
            title="Start your first update"
            description="Add short milestone posts or profile updates here."
          />
        ) : (
          form.profile_updates.map((item, index) => (
            <div
              key={`edit-update-${index}`}
              className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-400">
                  Update {index + 1}
                </p>

                <button
                  type="button"
                  onClick={() => removeUpdateItem(index)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition hover:bg-red-500/15 hover:text-red-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <textarea
                value={item.text}
                onChange={(e) => updateUpdateItem(index, e.target.value)}
                placeholder="Write an update..."
                rows={4}
                className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/40 focus:bg-white/[0.06]"
              />
            </div>
          ))
        )}
      </div>
    );
  };

  const renderPhotosTab = () => {
    if (!isEditing && !form.avatar_url && !form.cover_url && visiblePhotos.length === 0) {
      return (
        <EmptyPanel
          icon={ImageIcon}
          title="No photos yet"
          description="Photos and visual milestones can appear here."
        />
      );
    }

    if (!isEditing) {
      return (
        <div className="space-y-4">
          {profile?.avatar_url ? (
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04]">
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-sm font-semibold text-white">
                <Camera className="h-4 w-4" />
                Profile Photo
              </div>
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}

          {profile?.cover_url ? (
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04]">
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-sm font-semibold text-white">
                <ImageIcon className="h-4 w-4" />
                Cover Photo
              </div>
              <img
                src={profile.cover_url}
                alt="Cover"
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}

          {visiblePhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {visiblePhotos.map((photo, index) => (
                <div
                  key={`photo-${index}`}
                  className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04]"
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="h-40 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Profile Photo</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15">
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          {form.avatar_url ? (
            <div className="overflow-hidden rounded-[18px] border border-white/8 bg-black/20">
              <img
                src={form.avatar_url}
                alt="Avatar preview"
                className="h-52 w-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
              No profile photo uploaded yet
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Cover Photo</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15">
              {uploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </label>
          </div>

          {form.cover_url ? (
            <div className="overflow-hidden rounded-[18px] border border-white/8 bg-black/20">
              <img
                src={form.cover_url}
                alt="Cover preview"
                className="h-52 w-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
              No cover photo uploaded yet
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-white/6 bg-white/[0.045] p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Gallery Photos</p>
            <button
              type="button"
              onClick={addPhotoItem}
              className="inline-flex items-center gap-2 rounded-[14px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
            >
              <Plus className="h-4 w-4" />
              Add Slot
            </button>
          </div>

          {form.profile_photos.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
              No gallery photos yet
            </div>
          ) : (
            <div className="space-y-3">
              {form.profile_photos.map((photo, index) => (
                <div
                  key={`gallery-photo-${index}`}
                  className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-400">
                      Photo {index + 1}
                    </p>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15">
                        {uploadingGalleryIndex === index ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleGalleryUpload(e, index)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => removePhotoItem(index)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition hover:bg-red-500/15 hover:text-red-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {photo ? (
                    <div className="overflow-hidden rounded-[16px] border border-white/8 bg-black/20">
                      <img
                        src={photo}
                        alt={`Gallery preview ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
                      Empty photo slot
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAboutTab = () => {
    if (!isEditing) {
      return (
        <div className="space-y-3">
          <InfoCard icon={User} label="Name" value={displayName} />
          <InfoCard
            icon={FileText}
            label="Bio"
            value={profile?.bio || "No bio added yet"}
          />
          <InfoCard
            icon={Sparkles}
            label="Location"
            value={profile?.location || "Not available"}
          />
          <InfoCard
            icon={Mail}
            label="Website"
            value={profile?.website || "Not available"}
          />
          <InfoCard icon={CalendarDays} label="Joined" value={joinedLabel} />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <EditableField
          label="Bio"
          value={form.bio}
          onChange={(value) => updateField("bio", value)}
          placeholder="Tell people about yourself"
          multiline
        />
        <EditableField
          label="Location"
          value={form.location}
          onChange={(value) => updateField("location", value)}
          placeholder="Enter location"
        />
        <EditableField
          label="Website"
          value={form.website}
          onChange={(value) => updateField("website", value)}
          placeholder="Enter website"
        />
        <InfoCard icon={CalendarDays} label="Joined" value={joinedLabel} />
      </div>
    );
  };

  const renderTabContent = () => {
    if (activeTab === "overview") return renderOverviewTab();
    if (activeTab === "updates") return renderUpdatesTab();
    if (activeTab === "photos") return renderPhotosTab();
    return renderAboutTab();
  };

  const actionButtonLabel = isOwnProfile
    ? isEditing
      ? saving
        ? "Saving..."
        : "Save Changes"
      : "Edit Profile"
    : "Message";

  const actionButtonIcon = isOwnProfile ? (
    isEditing ? (
      <Save size={18} />
    ) : (
      <Pencil size={18} />
    )
  ) : (
    <MessageCircle size={18} />
  );

  const renderPartnershipAction = () => {
    if (isOwnProfile || !currentUserId || !resolvedProfileId) return null;

    if (partnershipStatus === "partnered") {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
          <Check className="h-3.5 w-3.5" />
          Partnered
        </div>
      );
    }

    if (partnershipStatus === "pending_sent") {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 backdrop-blur-md">
          <HandHelping className="h-3.5 w-3.5" />
          Request Sent
        </div>
      );
    }

    if (partnershipStatus === "pending_received") {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={acceptPartnershipRequest}
            disabled={partnershipLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-70"
          >
            {partnershipLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Accept
          </button>

          <button
            type="button"
            onClick={declinePartnershipRequest}
            disabled={partnershipLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-70"
          >
            {partnershipLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Decline
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={sendPartnershipRequest}
        disabled={partnershipLoading}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-70"
      >
        {partnershipLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <HandHelping className="h-3.5 w-3.5" />
        )}
        Request Partnership
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061018] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
            <p className="mt-3 text-sm text-slate-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#061018] px-4 pb-24 text-white">
        <div className="mx-auto max-w-md pt-4">
          <div className="mb-4 flex items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
            <User className="mx-auto mb-3 h-8 w-8 text-white/30" />
            <p className="text-base font-semibold">User not found</p>
            <p className="mt-1 text-sm text-white/50">
              This profile may not exist anymore.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#061018] text-white">
      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        <div className="mb-4 flex items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-emerald-400/10 bg-[#04111f] shadow-[0_18px_70px_rgba(0,0,0,0.34)]">
          <div
            className="relative h-[164px] overflow-hidden border-b border-white/5 bg-gradient-to-r from-[#0b3b2e] via-[#0f8f5a] to-[#0ea5e9]"
            style={
              (isEditing ? form.cover_url : profile?.cover_url)
                ? {
                    backgroundImage: `linear-gradient(to right, rgba(11,59,46,0.55), rgba(15,143,90,0.45), rgba(14,165,233,0.45)), url("${
                      isEditing ? form.cover_url : profile?.cover_url
                    }")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />
            <div className="absolute -right-10 top-[-18px] h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-8 bottom-[-28px] h-24 w-24 rounded-full bg-emerald-300/10 blur-2xl" />
          </div>

          <div className="relative px-5 pb-5">
            <div className="-mt-[58px] flex flex-col">
              <div className="flex items-end justify-between gap-3">
                <div className="relative flex h-[116px] w-[116px] items-center justify-center overflow-hidden rounded-[30px] border border-white/15 bg-[#0b1d2a]/90 text-[34px] font-extrabold text-white shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                  {((isEditing ? form.avatar_url : profile?.avatar_url) || "").trim() ? (
                    <img
                      src={(isEditing ? form.avatar_url : profile?.avatar_url).trim()}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}

                  {!((isEditing ? form.avatar_url : profile?.avatar_url) || "").trim()
                    ? initials
                    : null}
                </div>

                <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                  {renderPartnershipAction()}
                </div>
              </div>

              <div className="mt-4">
                <h1 className="truncate text-[30px] font-extrabold leading-none tracking-[-0.02em] text-white">
                  {isEditing ? liveDisplayName : displayName}
                </h1>

                <p className="mt-2 truncate text-sm text-white/70">
                  {(isEditing ? form.email : profile?.email) || "No email available"}
                </p>

                <div className="mt-4 flex items-center gap-2 text-[12px] text-emerald-200/90">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.9)]" />
                  <span className="truncate font-medium">
                    CLARA community profile
                  </span>
                </div>

                {!isOwnProfile && partnershipStatus === "pending_received" ? (
                  <p className="mt-3 text-[11px] font-medium text-emerald-200/80">
                    This member sent you a partnership request.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-2 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-3 text-center transition ${
                    isActive
                      ? "bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-[11px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isOwnProfile ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {isEditing ? `Editing ${activeTab}` : `Viewing ${activeTab}`}
              </p>
              <p className="text-xs text-white/50">
                {isEditing
                  ? "Edit directly inside this tab, then save."
                  : "Click Edit Profile to make this current tab editable."}
              </p>
            </div>

            {isEditing ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                <X size={15} />
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}

        {saveError ? (
          <div className="mt-4 rounded-[18px] border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {saveError}
          </div>
        ) : null}

        {saveSuccess ? (
          <div className="mt-4 rounded-[18px] border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {saveSuccess}
          </div>
        ) : null}

        <div className="mt-4">{renderTabContent()}</div>

        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[#061018] via-[#061018]/95 to-transparent pt-6">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={saving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#0f8f5a] to-[#06b6d4] font-semibold text-white shadow-[0_16px_40px_rgba(6,182,212,0.18)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {actionButtonIcon}
            <span>{actionButtonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}