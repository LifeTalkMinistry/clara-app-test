import { useCallback, useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatSupabaseError,
  loadKeyValueSettings,
  saveKeyValueSettings,
  uploadPublicFile,
} from "@/lib/admin-panel-utils";

const SETTINGS_BUCKET = "settings";

const DEFAULT_SETTINGS = {
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

  async function handleQrUpload(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadPublicFile({
        bucket: SETTINGS_BUCKET,
        file,
        folder: `qr/${field}`,
      });

      setSettings((prev) => ({ ...prev, [field]: url }));
    } catch (error) {
      console.error("Failed to upload QR image:", error);
      setErrorText(error.message || "Failed to upload QR image.");
      alert(error.message || "Failed to upload QR image.");
    } finally {
      event.target.value = "";
    }
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
        <div>
          {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
        </div>
        <Button variant="outline" onClick={loadSettings}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-4">
        <p className="font-semibold">Payment Settings</p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            value={settings.gcash_number}
            onChange={(e) => setSettings({ ...settings, gcash_number: e.target.value })}
            placeholder="GCash Number"
          />
          <Input
            value={settings.gcash_name}
            onChange={(e) => setSettings({ ...settings, gcash_name: e.target.value })}
            placeholder="GCash Name"
          />
        </div>

        <Input type="file" onChange={(e) => handleQrUpload(e, "gcash_qr_url")} />
        {settings.gcash_qr_url ? (
          <img src={settings.gcash_qr_url} className="h-24 rounded" alt="GCash QR" />
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <Input
            value={settings.bank_name}
            onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
            placeholder="Bank Name"
          />
          <Input
            value={settings.bank_account}
            onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })}
            placeholder="Account No"
          />
          <Input
            value={settings.bank_holder}
            onChange={(e) => setSettings({ ...settings, bank_holder: e.target.value })}
            placeholder="Holder"
          />
        </div>

        <Input type="file" onChange={(e) => handleQrUpload(e, "bank_qr_url")} />
        {settings.bank_qr_url ? (
          <img src={settings.bank_qr_url} className="h-24 rounded" alt="Bank QR" />
        ) : null}
      </div>

      <div className="bg-card rounded-xl border p-4 grid grid-cols-2 gap-3">
        <Input
          value={settings.standard_price}
          onChange={(e) => setSettings({ ...settings, standard_price: e.target.value })}
          placeholder="Standard Price"
        />
        <Input
          value={settings.premium_price}
          onChange={(e) => setSettings({ ...settings, premium_price: e.target.value })}
          placeholder="Premium Price"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
