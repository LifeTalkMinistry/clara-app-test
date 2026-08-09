import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import {
  createAdminCommunityBoardItem,
  deleteAdminCommunityBoardItem,
  fetchAdminCommunityBoardItems,
  updateAdminCommunityBoardItem,
} from "@/lib/admin-backend-client";
import { uploadCommunityMedia } from "@/lib/community-media-client";
import AuthenticatedCommunityImage from "@/components/community/AuthenticatedCommunityImage";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_RATIO = 2.35;
const MAX_RATIO = 2.65;
const MIN_WIDTH = 1000;
const MIN_HEIGHT = 400;

function inspectImage(file) {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.has(file?.type)) {
      reject(new Error("Use a JPG, PNG, or WebP image for CLARA Board."));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const result = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("CLARA could not read that image."));
    };
    image.src = url;
  });
}

async function validateBoardImage(file) {
  if (!file) throw new Error("Choose a board image first.");
  const dimensions = await inspectImage(file);
  const ratio = dimensions.width / Math.max(dimensions.height, 1);

  if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
    throw new Error(
      `Use a 2.5:1 CLARA Board image. Recommended: 1500 × 600 px. This image is ${dimensions.width} × ${dimensions.height} px.`
    );
  }

  if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
    throw new Error(
      `This image is ${dimensions.width} × ${dimensions.height} px. Use at least 1000 × 400 px; 1500 × 600 px is recommended for a premium result.`
    );
  }

  return dimensions;
}

function typeLabel(type) {
  if (type === "sponsored") return "Sponsored";
  if (type === "announcement") return "Announcement";
  return "Fact / Education";
}

export default function AdminCommunityBoardSection() {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [itemType, setItemType] = useState("fact");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [altText, setAltText] = useState("CLARA Board");
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAdminCommunityBoardItems();
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);
      setSortOrder((current) => (current === "0" && nextItems.length ? String(nextItems.length * 10) : current));
    } catch (loadError) {
      setError(loadError?.message || "Unable to load CLARA Board items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const activeCount = useMemo(() => items.filter((item) => item.is_active).length, [items]);

  const chooseFile = async (nextFile) => {
    setError("");
    setSuccess("");
    setFile(null);
    setDimensions(null);
    try {
      const nextDimensions = await validateBoardImage(nextFile);
      setFile(nextFile);
      setDimensions(nextDimensions);
    } catch (validationError) {
      setError(validationError?.message || "That image cannot be used for CLARA Board.");
    }
  };

  const publish = async () => {
    if (!file || saving) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const media = await uploadCommunityMedia(file);
      await createAdminCommunityBoardItem({
        image_url: media.media_url,
        item_type: itemType,
        destination_url: destinationUrl.trim(),
        alt_text: altText.trim() || "CLARA Board",
        is_active: true,
        sort_order: Number(sortOrder) || 0,
      });
      setFile(null);
      setDimensions(null);
      setDestinationUrl("");
      setAltText("CLARA Board");
      setSuccess("Board image published. It will now appear in Community.");
      await loadItems();
    } catch (publishError) {
      setError(publishError?.message || "Unable to publish that CLARA Board image.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    if (!item?.id || busyItemId) return;
    try {
      setBusyItemId(item.id);
      setError("");
      await updateAdminCommunityBoardItem(item.id, { is_active: !item.is_active });
      await loadItems();
    } catch (toggleError) {
      setError(toggleError?.message || "Unable to update that board item.");
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (item) => {
    if (!item?.id || busyItemId) return;
    if (!window.confirm("Delete this CLARA Board image? This also removes its uploaded media file.")) return;
    try {
      setBusyItemId(item.id);
      setError("");
      await deleteAdminCommunityBoardItem(item.id);
      await loadItems();
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete that board item.");
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <section className="rounded-[28px] border border-cyan-300/10 bg-white/[0.035] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">Community content</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-white">CLARA Board</h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-white/45">
            Upload the finished artwork here. Community keeps the board compact and simply rotates these images.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[10px] font-black text-white/50">
          {activeCount} active
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-cyan-300/10 bg-[#071725]/75 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-300/[0.06] text-cyan-100">
            <ImagePlus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Board artwork size</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-5 text-white/45">
              Recommended: <span className="font-black text-cyan-100/80">1500 × 600 px</span> · 2.5:1 ratio · JPG, PNG, or WebP.
              Keep important text away from the extreme edges.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-cyan-200/20 bg-cyan-300/[0.025] px-4 text-center transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.045]">
            <ImagePlus className="h-5 w-5 text-cyan-100/65" />
            <span className="mt-2 text-xs font-black text-white/75">Choose board image</span>
            <span className="mt-1 text-[10px] font-semibold text-white/35">
              {file ? file.name : "1500 × 600 recommended"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={saving}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void chooseFile(selected);
                event.target.value = "";
              }}
            />
          </label>

          <div className="rounded-[18px] border border-white/[0.07] bg-black/10 p-3.5">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">Selected artwork</p>
            {file && dimensions ? (
              <div className="mt-2">
                <p className="truncate text-xs font-black text-white/80">{file.name}</p>
                <p className="mt-1 text-[10px] font-bold text-cyan-100/60">
                  {dimensions.width} × {dimensions.height} px · {(dimensions.width / dimensions.height).toFixed(2)}:1
                </p>
                <p className="mt-2 text-[10px] font-semibold text-emerald-200/70">Ready to publish</p>
              </div>
            ) : (
              <p className="mt-3 text-[11px] font-semibold leading-5 text-white/35">
                CLARA checks the image ratio and minimum resolution before uploading it.
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">Type</span>
            <select
              value={itemType}
              onChange={(event) => setItemType(event.target.value)}
              disabled={saving}
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#08192a] px-3 text-xs font-bold text-white outline-none"
            >
              <option value="fact">Fact / Education</option>
              <option value="announcement">Announcement</option>
              <option value="sponsored">Sponsored</option>
            </select>
          </label>

          <label className="block lg:col-span-2">
            <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">Tap destination · optional</span>
            <div className="relative mt-1.5">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
              <input
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                disabled={saving}
                placeholder="/savings-goals or https://..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#08192a] pl-9 pr-3 text-xs font-semibold text-white outline-none placeholder:text-white/25"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">Order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              disabled={saving}
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#08192a] px-3 text-xs font-bold text-white outline-none"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">Image description · accessibility</span>
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            disabled={saving}
            maxLength={180}
            placeholder="Describe what is shown on the board"
            className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#08192a] px-3 text-xs font-semibold text-white outline-none placeholder:text-white/25"
          />
        </label>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-300/15 bg-red-500/[0.08] px-3 py-2.5 text-[11px] font-bold text-red-100/85">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-2.5 text-[11px] font-bold text-emerald-100/80">{success}</div>
        ) : null}

        <button
          type="button"
          onClick={publish}
          disabled={!file || saving}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#2dd4bf,#22b9e8)] px-5 text-xs font-black text-[#032f34] shadow-[0_10px_28px_rgba(45,212,191,0.16)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {saving ? "Publishing..." : "Publish to CLARA Board"}
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white/85">Current board images</h3>
          <button
            type="button"
            onClick={loadItems}
            disabled={loading}
            className="text-[10px] font-black text-cyan-100/55 hover:text-cyan-100"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-3 flex h-28 items-center justify-center rounded-[18px] border border-white/[0.06] bg-black/10">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-100/45" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-3 rounded-[18px] border border-white/[0.06] bg-black/10 px-4 py-8 text-center text-xs font-semibold text-white/35">
            No uploaded board images yet. Until you publish one, Community keeps the original compact Community hero.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#071725]">
                <div className="relative aspect-[5/2] overflow-hidden bg-black/20">
                  <AuthenticatedCommunityImage
                    src={item.image_url}
                    alt={item.alt_text || "CLARA Board"}
                    className="h-full w-full object-cover"
                  />
                  {item.item_type === "sponsored" ? (
                    <span className="absolute left-2.5 top-2.5 rounded-full border border-white/20 bg-[#04111f]/80 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/85">
                      Sponsored
                    </span>
                  ) : null}
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-cyan-100/55">{typeLabel(item.item_type)}</p>
                      <p className="mt-1 truncate text-[11px] font-bold text-white/45">
                        {item.destination_url || "No tap destination"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] font-black text-white/35">
                      #{item.sort_order}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      disabled={busyItemId === item.id}
                      className={`h-9 flex-1 rounded-xl border text-[10px] font-black transition ${
                        item.is_active
                          ? "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-100/80"
                          : "border-white/[0.08] bg-white/[0.035] text-white/45"
                      }`}
                    >
                      {item.is_active ? "Active" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      disabled={busyItemId === item.id}
                      className="flex h-9 w-10 items-center justify-center rounded-xl border border-red-300/10 bg-red-500/[0.05] text-red-200/55 transition hover:text-red-100"
                      aria-label="Delete board item"
                    >
                      {busyItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
