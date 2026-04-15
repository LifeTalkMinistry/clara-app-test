import { useCallback, useEffect, useState } from "react";
import { ImagePlus, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formatSupabaseError,
  loadKeyValueSettings,
  saveKeyValueSettings,
  uploadPublicFile,
} from "@/lib/admin-panel-utils";
import { UNIVERSAL_ONBOARDING_SETTINGS_DEFAULTS } from "@/lib/universal-onboarding-content";

const SETTINGS_BUCKET = "settings";

const PAYMENT_SETTINGS_DEFAULTS = {
  gcash_number: "09858410403",
  gcash_name: "Jerome Mirabuenos",
  bank_name: "Security Bank",
  bank_account: "000-006-704-2019",
  bank_holder: "CLARA Financial Program",
  standard_price: "499",
  premium_price: "999",
  gcash_qr_url: "",
  bank_qr_url: "",
};

const DEFAULT_SETTINGS = {
  ...PAYMENT_SETTINGS_DEFAULTS,
  ...UNIVERSAL_ONBOARDING_SETTINGS_DEFAULTS,
};

const ONBOARDING_MEDIA_FIELDS = [
  {
    key: "onboarding_welcome_media_url",
    label: "Welcome image",
    description: "Optional premium hero image for the welcome screen.",
  },
  {
    key: "onboarding_founder_media_url",
    label: "Founder image",
    description: "Optional image for the trust-building founder section.",
  },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errorText, setErrorText] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      setLoaded(false);
      setErrorText("");

      const data = await loadKeyValueSettings(Object.keys(DEFAULT_SETTINGS));

      setSettings((prev) => ({
        ...prev,
        ...data,
      }));
    } catch (error) {
      console.error("Failed to load admin settings:", error);
      setErrorText(formatSupabaseError(error, "Failed to load admin settings."));
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    setErrorText("");

    try {
      await saveKeyValueSettings(settings);
    } catch (error) {
      console.error("Failed to save admin settings:", error);
      setErrorText(formatSupabaseError(error, "Failed to save admin settings."));
      alert(formatSupabaseError(error, "Failed to save admin settings."));
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(event, field, folder = `onboarding/${field}`) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadPublicFile({
        bucket: SETTINGS_BUCKET,
        file,
        folder,
      });

      setSettings((prev) => ({ ...prev, [field]: url }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      setErrorText(error.message || "Failed to upload image.");
      alert(error.message || "Failed to upload image.");
    } finally {
      event.target.value = "";
    }
  }

  function renderTextField({
    key,
    label,
    placeholder,
    multiline = false,
    rows = 3,
    description = "",
  }) {
    const commonProps = {
      value: settings[key] || "",
      onChange: (event) => setSettings((prev) => ({ ...prev, [key]: event.target.value })),
      placeholder,
    };

    return (
      <label key={key} className="space-y-2">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {description ? <p className="mt-1 text-xs text-white/55">{description}</p> : null}
        </div>
        {multiline ? (
          <Textarea
            {...commonProps}
            rows={rows}
            className="min-h-[110px] rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
          />
        ) : (
          <Input
            {...commonProps}
            className="rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
          />
        )}
      </label>
    );
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>{errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}</div>
        <Button variant="outline" onClick={loadSettings}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-4">
        <p className="font-semibold text-white">Payment Settings</p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            value={settings.gcash_number}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, gcash_number: event.target.value }))
            }
            placeholder="GCash Number"
          />
          <Input
            value={settings.gcash_name}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, gcash_name: event.target.value }))
            }
            placeholder="GCash Name"
          />
        </div>

        <Input
          type="file"
          onChange={(event) => handleImageUpload(event, "gcash_qr_url", "qr/gcash_qr_url")}
        />
        {settings.gcash_qr_url ? (
          <img src={settings.gcash_qr_url} className="h-24 rounded" alt="GCash QR" />
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <Input
            value={settings.bank_name}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, bank_name: event.target.value }))
            }
            placeholder="Bank Name"
          />
          <Input
            value={settings.bank_account}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, bank_account: event.target.value }))
            }
            placeholder="Account No"
          />
          <Input
            value={settings.bank_holder}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, bank_holder: event.target.value }))
            }
            placeholder="Holder"
          />
        </div>

        <Input
          type="file"
          onChange={(event) => handleImageUpload(event, "bank_qr_url", "qr/bank_qr_url")}
        />
        {settings.bank_qr_url ? (
          <img src={settings.bank_qr_url} className="h-24 rounded" alt="Bank QR" />
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-card p-4 grid grid-cols-2 gap-3">
        <Input
          value={settings.standard_price}
          onChange={(event) =>
            setSettings((prev) => ({ ...prev, standard_price: event.target.value }))
          }
          placeholder="Standard Price"
        />
        <Input
          value={settings.premium_price}
          onChange={(event) =>
            setSettings((prev) => ({ ...prev, premium_price: event.target.value }))
          }
          placeholder="Premium Price"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-5">
        <div>
          <p className="font-semibold text-white">Universal Onboarding Content</p>
          <p className="mt-1 text-sm text-white/55">
            Copy and media are editable here. Flow order, setup questions, result logic, and
            completion behavior stay protected in code.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {renderTextField({
            key: "onboarding_welcome_badge",
            label: "Welcome badge",
            placeholder: "A Guided Arrival",
          })}
          {renderTextField({
            key: "onboarding_welcome_cta",
            label: "Welcome CTA",
            placeholder: "Start your setup",
          })}
        </div>

        {renderTextField({
          key: "onboarding_welcome_headline",
          label: "Welcome headline",
          placeholder: "Welcome to CLARA.",
        })}

        {renderTextField({
          key: "onboarding_welcome_subheadline",
          label: "Welcome subheadline",
          placeholder: "A calm, structured system...",
          multiline: true,
          rows: 3,
        })}

        <div className="grid gap-4 md:grid-cols-2">
          {ONBOARDING_MEDIA_FIELDS.map((field) => (
            <div key={field.key} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm font-medium text-white">{field.label}</p>
              <p className="mt-1 text-xs text-white/55">{field.description}</p>
              <Input
                value={settings[field.key] || ""}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                placeholder="https://..."
                className="mt-3 rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
              />
              <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06]">
                <ImagePlus className="h-4 w-4" />
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleImageUpload(event, field.key)}
                />
              </label>
              {settings[field.key] ? (
                <img
                  src={settings[field.key]}
                  alt={field.label}
                  className="mt-3 h-32 w-full rounded-xl object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div>
            <p className="font-medium text-white">Intro slides</p>
            <p className="mt-1 text-xs text-white/55">
              These control the 4 premium What is CLARA cards shown after welcome.
            </p>
          </div>

          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="grid gap-4 rounded-2xl border border-white/10 p-4">
              {renderTextField({
                key: `onboarding_slide_${index}_title`,
                label: `Slide ${index} title`,
                placeholder: `Slide ${index} title`,
              })}
              {renderTextField({
                key: `onboarding_slide_${index}_description`,
                label: `Slide ${index} description`,
                placeholder: "Short supporting text",
                multiline: true,
                rows: 3,
              })}
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div>
            <p className="font-medium text-white">Founder / trust section</p>
            <p className="mt-1 text-xs text-white/55">
              Keep this warm, human, and concise.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {renderTextField({
              key: "onboarding_founder_badge",
              label: "Founder badge",
              placeholder: "Why CLARA Exists",
            })}
            {renderTextField({
              key: "onboarding_founder_headline",
              label: "Founder headline",
              placeholder: "Created to bring clarity...",
            })}
          </div>

          {renderTextField({
            key: "onboarding_founder_body",
            label: "Founder body",
            placeholder: "Short founder introduction...",
            multiline: true,
            rows: 4,
          })}
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div>
            <p className="font-medium text-white">Result screen teaser</p>
            <p className="mt-1 text-xs text-white/55">
              This appears under the personalized result to softly point users toward deeper support.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {renderTextField({
              key: "onboarding_teaser_badge",
              label: "Teaser badge",
              placeholder: "Next Layer",
            })}
            {renderTextField({
              key: "onboarding_teaser_cta",
              label: "Teaser CTA label",
              placeholder: "Explore guided options",
            })}
          </div>

          {renderTextField({
            key: "onboarding_teaser_headline",
            label: "Teaser headline",
            placeholder: "There is more guidance available when you want it.",
          })}

          {renderTextField({
            key: "onboarding_teaser_body",
            label: "Teaser body",
            placeholder: "CLARA can stay lightweight...",
            multiline: true,
            rows: 3,
          })}
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div>
            <p className="font-medium text-white">Personalized result copy</p>
            <p className="mt-1 text-xs text-white/55">
              These messages are selected by protected code based on the user’s answers.
            </p>
          </div>

          {[
            ["tools", "Tools-first result"],
            ["system", "Guided-system result"],
            ["guidance", "Support-heavy result"],
          ].map(([prefix, title]) => (
            <div key={prefix} className="grid gap-4 rounded-2xl border border-white/10 p-4">
              <p className="text-sm font-medium text-white">{title}</p>
              {renderTextField({
                key: `onboarding_result_${prefix}_title`,
                label: "Result headline",
                placeholder: "Headline",
              })}
              {renderTextField({
                key: `onboarding_result_${prefix}_body`,
                label: "Result body",
                placeholder: "Short explanatory body",
                multiline: true,
                rows: 3,
              })}
              <div className="grid gap-4 md:grid-cols-2">
                {renderTextField({
                  key: `onboarding_result_${prefix}_primary_cta`,
                  label: "Primary CTA",
                  placeholder: "Primary action",
                })}
                {renderTextField({
                  key: `onboarding_result_${prefix}_secondary_cta`,
                  label: "Secondary CTA",
                  placeholder: "Secondary action",
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
