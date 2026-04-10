import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const BILLBOARD_BUCKET = "billboards";
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "application/pdf",
];

const EMPTY = {
  title: "",
  body: "",
  media_url: "",
  media_type: "none",
  file_name: "",
  is_active: true,
  sort_order: 1,
  tag_label: "",
  cta_label: "",
  cta_url: "",
};

const normalizeString = (value) => String(value ?? "").trim();

const toNullableString = (value) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
};

const slugifyFileName = (name = "") => {
  const clean = name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return clean || "file";
};

const getFileExtension = (fileName = "", mimeType = "") => {
  const extFromName = fileName.split(".").pop()?.toLowerCase();
  if (extFromName && extFromName !== fileName.toLowerCase()) return extFromName;

  const mimeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogg",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  };

  return mimeMap[mimeType] || "file";
};

const isYouTubeUrl = (url = "") => {
  const value = normalizeString(url);
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)/i.test(
    value
  );
};

const getYouTubeEmbedUrl = (url = "") => {
  const value = normalizeString(url);
  if (!value) return "";

  try {
    const parsed = new URL(value);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.pathname.includes("/shorts/")) {
      const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.pathname.includes("/embed/")) {
      const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    const id = parsed.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
};

const inferMediaType = (fileOrUrl, mimeType = "") => {
  const type = normalizeString(mimeType).toLowerCase();
  const value = normalizeString(
    typeof fileOrUrl === "string" ? fileOrUrl : fileOrUrl?.name
  ).toLowerCase();

  if (isYouTubeUrl(value)) return "youtube";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";

  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(value)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(value)) return "image";
  if (/\.pdf$/i.test(value)) return "pdf";
  if (value) return "file";

  return "none";
};

const getPublicFileUrl = (path) => {
  const { data } = supabase.storage.from(BILLBOARD_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
};

const getFriendlySaveError = (error) => {
  const message = normalizeString(error?.message).toLowerCase();

  if (
    message.includes("tag_label") ||
    message.includes("cta_label") ||
    message.includes("cta_url") ||
    message.includes("column")
  ) {
    return (
      "Failed to save billboard item because your Supabase billboards table is missing one or more optional columns. Make sure tag_label, cta_label, and cta_url exist and are nullable."
    );
  }

  return error?.message
    ? `Failed to save billboard item: ${error.message}`
    : "Failed to save billboard item. Please check your table and storage settings.";
};

const getFriendlyUploadError = (error) => {
  const message = normalizeString(error?.message);

  if (!message) {
    return "Upload failed. Please check your storage bucket and policies.";
  }

  if (/bucket/i.test(message) || /not found/i.test(message)) {
    return "Upload failed because the Supabase storage bucket 'billboards' does not exist.";
  }

  if (/row-level security|policy|permission|unauthorized|forbidden/i.test(message)) {
    return "Upload failed because your storage policies are blocking the upload.";
  }

  return `Upload failed: ${message}`;
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function AdminBillboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [errorText, setErrorText] = useState("");

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderA = Number(a?.sort_order) || 0;
      const orderB = Number(b?.sort_order) || 0;

      if (orderA !== orderB) return orderA - orderB;

      const dateA = new Date(a?.created_at || 0).getTime();
      const dateB = new Date(b?.created_at || 0).getTime();

      return dateB - dateA;
    });
  }, [items]);

  const resetForm = useCallback(() => {
    setForm(EMPTY);
    setEditId(null);
    setUploadStatus("");
    setErrorText("");
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("billboards")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (error) {
      console.error("Failed to fetch billboards:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("admin-billboards-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboards" },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorText("");
    setUploadStatus("");
    setUploading(true);

    try {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(
          `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB. Selected file is ${formatFileSize(
            file.size
          )}.`
        );
      }

      if (
        file.type &&
        !ACCEPTED_FILE_TYPES.includes(file.type) &&
        inferMediaType(file.name, file.type) === "file"
      ) {
        throw new Error(
          "Unsupported file type. Please upload an image, video, or PDF."
        );
      }

      setUploadStatus("Preparing upload...");

      const ext = getFileExtension(file.name, file.type);
      const safeName = slugifyFileName(file.name);
      const filePath = `admin/${Date.now()}-${safeName}.${ext}`;

      setUploadStatus("Uploading file...");

      const { error: uploadError } = await supabase.storage
        .from(BILLBOARD_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      setUploadStatus("Generating public URL...");

      const publicUrl = getPublicFileUrl(filePath);
      if (!publicUrl) {
        throw new Error("Upload succeeded but the public URL could not be generated.");
      }

      const mediaType = inferMediaType(file.name, file.type);

      setForm((prev) => ({
        ...prev,
        media_url: publicUrl,
        media_type: mediaType,
        file_name: file.name,
        cta_url: prev.cta_url || publicUrl,
      }));

      setUploadStatus("Upload complete.");
    } catch (error) {
      console.error("Upload failed:", error);
      const friendly = getFriendlyUploadError(error);
      setErrorText(friendly);
      alert(friendly);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    const safeTitle = normalizeString(form.title);
    const safeBody = normalizeString(form.body);
    const safeMediaUrl = normalizeString(form.media_url);
    const safeTagLabel = toNullableString(form.tag_label);
    const safeCtaLabel = toNullableString(form.cta_label);
    const safeCtaUrl = toNullableString(form.cta_url);
    const safeFileName = toNullableString(form.file_name);

    if (!safeTitle && !safeBody && !safeMediaUrl) {
      alert("Add at least a title, body, or media.");
      return;
    }

    setSaving(true);
    setErrorText("");

    try {
      const inferredType =
        form.media_type && form.media_type !== "none"
          ? form.media_type
          : inferMediaType(safeMediaUrl);

      const payload = {
        title: safeTitle || null,
        body: safeBody || null,
        media_url: safeMediaUrl || null,
        media_type: inferredType,
        file_name: safeFileName,
        is_active: Boolean(form.is_active),
        sort_order: Number(form.sort_order) || 1,
        tag_label: safeTagLabel,
        cta_label: safeCtaLabel,
        cta_url: safeCtaUrl,
      };

      if (editId) {
        const { data, error } = await supabase
          .from("billboards")
          .update(payload)
          .eq("id", editId)
          .select()
          .single();

        if (error) throw error;

        setItems((prev) => prev.map((item) => (item.id === editId ? data : item)));
      } else {
        const { data, error } = await supabase
          .from("billboards")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setItems((prev) => [data, ...prev]);
      }

      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Save failed:", error);
      const friendly = getFriendlySaveError(error);
      setErrorText(friendly);
      alert(friendly);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setErrorText("");
    setUploadStatus("");
    setForm({
      title: item?.title || "",
      body: item?.body || "",
      media_url: item?.media_url || "",
      media_type: item?.media_type || inferMediaType(item?.media_url),
      file_name: item?.file_name || "",
      is_active: Boolean(item?.is_active),
      sort_order: Number(item?.sort_order) || 1,
      tag_label: item?.tag_label || "",
      cta_label: item?.cta_label || "",
      cta_url: item?.cta_url || "",
    });
    setEditId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this billboard item?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("billboards").delete().eq("id", id);
      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error?.message ? `Failed to delete billboard item: ${error.message}` : "Failed to delete billboard item.");
    }
  };

  const toggleActive = async (item) => {
    try {
      const { data, error } = await supabase
        .from("billboards")
        .update({ is_active: !item.is_active })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
    } catch (error) {
      console.error("Toggle failed:", error);
      alert(error?.message ? `Failed to update active status: ${error.message}` : "Failed to update active status.");
    }
  };

  const previewType =
    form.media_type && form.media_type !== "none"
      ? form.media_type
      : inferMediaType(form.media_url);

  const previewCtaTarget =
    normalizeString(form.cta_url) || normalizeString(form.media_url);

  const previewYouTubeEmbed =
    previewType === "youtube" ? getYouTubeEmbedUrl(form.media_url) : "";

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Billboard Manager</h2>
          <p className="text-sm text-muted-foreground">
            Fully control billboard text, labels, CTA, CTA link, and media.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchItems}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>

          <Dialog
            open={open}
            onOpenChange={(value) => {
              if (!value) resetForm();
              setOpen(value);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Billboard
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Billboard" : "New Billboard"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {!!errorText && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div>
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Optional title"
                  />
                </div>

                <div>
                  <Label>Body / Caption</Label>
                  <Textarea
                    value={form.body}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, body: e.target.value }))
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>Top Label</Label>
                    <Input
                      value={form.tag_label}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tag_label: e.target.value }))
                      }
                      placeholder="Sponsored, Promo, New, or leave blank"
                    />
                  </div>

                  <div>
                    <Label>CTA Label</Label>
                    <Input
                      value={form.cta_label}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, cta_label: e.target.value }))
                      }
                      placeholder="Learn more, Open, View offer, or leave blank"
                    />
                  </div>
                </div>

                <div>
                  <Label>CTA URL</Label>
                  <Input
                    value={form.cta_url}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cta_url: e.target.value }))
                    }
                    placeholder="Optional link for CTA button or file open"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-muted/30 px-4 py-4 text-sm hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    <span>{uploading ? uploadStatus || "Uploading..." : "Choose file"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                      disabled={uploading}
                      accept="image/*,video/*,.pdf"
                    />
                  </label>

                  <p className="text-xs text-muted-foreground">
                    Supports image, video, and PDF. Max file size: {MAX_FILE_SIZE_MB} MB.
                  </p>
                </div>

                <div>
                  <Label>Or Paste Direct URL</Label>
                  <Input
                    value={form.media_url}
                    onChange={(e) =>
                      setForm((prev) => {
                        const nextUrl = e.target.value;
                        const inferredType = inferMediaType(nextUrl);

                        return {
                          ...prev,
                          media_url: nextUrl,
                          media_type:
                            prev.media_type === "none" ||
                            prev.media_type === "file" ||
                            prev.media_type === "youtube"
                              ? inferredType
                              : prev.media_type,
                        };
                      })
                    }
                    placeholder="https://..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    YouTube links are automatically detected and embedded in preview.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>Media Type</Label>
                    <Select
                      value={form.media_type}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, media_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select media type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sort_order: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">
                      Show this item on dashboard
                    </p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>

                {!!form.media_url && (
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                      Preview
                    </div>

                    <div className="space-y-3 p-3">
                      {normalizeString(form.tag_label) && (
                        <div className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium">
                          {form.tag_label}
                        </div>
                      )}

                      {previewType === "image" && (
                        <img
                          src={form.media_url}
                          alt={form.title || "Preview"}
                          className="max-h-56 w-full rounded-lg object-cover"
                        />
                      )}

                      {previewType === "video" && (
                        <video
                          src={form.media_url}
                          controls
                          className="max-h-56 w-full rounded-lg bg-black"
                        />
                      )}

                      {previewType === "youtube" && (
                        <>
                          {previewYouTubeEmbed ? (
                            <div className="overflow-hidden rounded-lg border">
                              <iframe
                                src={previewYouTubeEmbed}
                                title={form.title || "YouTube Preview"}
                                className="aspect-video w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                              Invalid YouTube link.
                            </div>
                          )}
                        </>
                      )}

                      {previewType === "pdf" && (
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                          <FileText className="h-5 w-5" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {form.file_name || "PDF file"}
                            </p>
                            <p className="text-xs text-muted-foreground">PDF attached</p>
                          </div>
                          <a
                            href={form.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {previewType === "file" && (
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                          <FileText className="h-5 w-5" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {form.file_name || "Attached file"}
                            </p>
                            <p className="text-xs text-muted-foreground">General file</p>
                          </div>
                          <a
                            href={form.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {!!normalizeString(form.title) && (
                        <p className="text-sm font-semibold">{form.title}</p>
                      )}

                      {!!normalizeString(form.body) && (
                        <p className="text-sm text-muted-foreground">{form.body}</p>
                      )}

                      {!!normalizeString(form.cta_label) && (
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              if (!previewCtaTarget) return;
                              window.open(previewCtaTarget, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Link2 className="h-4 w-4" />
                            {form.cta_label}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={saving || uploading}
                >
                  {saving ? "Saving..." : editId ? "Update Billboard" : "Post Billboard"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            No billboard items yet.
          </div>
        ) : (
          sortedItems.map((item) => {
            const type = item?.media_type || inferMediaType(item?.media_url);
            const hasTag = !!normalizeString(item?.tag_label);
            const hasCta = !!normalizeString(item?.cta_label);
            const ctaTarget =
              normalizeString(item?.cta_url) || normalizeString(item?.media_url);

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border bg-card p-3"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {type === "image" && item.media_url ? (
                    <img
                      src={item.media_url}
                      alt={item.title || "Billboard"}
                      className="h-full w-full object-cover"
                    />
                  ) : type === "video" ? (
                    <Video className="h-5 w-5" />
                  ) : type === "youtube" ? (
                    <Video className="h-5 w-5" />
                  ) : type === "pdf" || type === "file" ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <ImageIcon className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {item.title || "Untitled billboard"}
                  </p>

                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.body || "No description"}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full border px-2 py-0.5 uppercase">
                      {type}
                    </span>

                    <span>Order: {Number(item.sort_order) || 1}</span>

                    {hasTag && (
                      <span className="rounded-full border px-2 py-0.5">
                        Tag: {item.tag_label}
                      </span>
                    )}

                    {hasCta && (
                      <span className="rounded-full border px-2 py-0.5">
                        CTA: {item.cta_label}
                      </span>
                    )}

                    {!!normalizeString(item?.cta_url) && (
                      <span className="rounded-full border px-2 py-0.5">
                        Linked
                      </span>
                    )}
                  </div>
                </div>

                {hasCta && ctaTarget ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden md:inline-flex"
                    onClick={() =>
                      window.open(ctaTarget, "_blank", "noopener,noreferrer")
                    }
                  >
                    {item.cta_label}
                  </Button>
                ) : null}

                <Switch
                  checked={Boolean(item.is_active)}
                  onCheckedChange={() => toggleActive(item)}
                />

                <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}