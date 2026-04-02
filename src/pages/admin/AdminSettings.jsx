import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    gcash_number: "09858410403",
    gcash_name: "Jerome Mirabuenos",
    bank_name: "Security Bank",
    bank_account: "000-006-704-2019",
    bank_holder: "CLARA Financial Program",
    standard_price: "499",
    premium_price: "999",
    gcash_qr_url: "",
    bank_qr_url: "",
  });

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await API.get("/settings");
      const data = res.data || {};

      setSettings(prev => ({
        ...prev,
        ...data,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoaded(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.post("/settings", settings);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await API.post("/upload", formData);
    return res.data.url;
  };

  const handleQrUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const url = await uploadFile(file);
      setSettings(prev => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error(err);
    }
  };

  if (!loaded)
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Payment */}
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
        {settings.gcash_qr_url && (
          <img src={settings.gcash_qr_url} className="h-24 rounded" />
        )}

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
        {settings.bank_qr_url && (
          <img src={settings.bank_qr_url} className="h-24 rounded" />
        )}
      </div>

      {/* Pricing */}
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