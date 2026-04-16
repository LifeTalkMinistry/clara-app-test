import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  GraduationCap,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
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
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/admin-panel-utils";

const timeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

export default function Coaching() {
  const navigate = useNavigate();
  const { user, access, loading: accessLoading } = useUserRole();
  const hasFullCoaching = access.coachingFull;
  const hasCoachingTeaser = access.coachingTeaser;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: "",
    time: "9:00 AM",
    topic: "",
    notes: "",
  });

  const loadRequests = useCallback(async () => {
    if (!user?.email || !hasFullCoaching) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("coaching_requests")
        .select("*")
        .or(`user_id.eq.${user.id},created_by.eq.${user.email}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Failed to load coaching requests:", error);
      setRequests([]);
      setErrorText(formatSupabaseError(error, "Failed to load coaching requests."));
    } finally {
      setLoading(false);
    }
  }, [hasFullCoaching, user?.email, user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing coaching..." />;
  }

  if (!hasCoachingTeaser) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={GraduationCap}
          title="Coaching is locked"
          description="Turn on coaching for this plan or upgrade to book sessions."
        />
      </div>
    );
  }

  if (!hasFullCoaching) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <PageHeader title="Coaching" subtitle="Preview your support layer" />
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6 text-white">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100/70">Teaser Access</p>
          <h2 className="mt-2 text-2xl font-semibold">Your plan can preview coaching</h2>
          <p className="mt-3 text-sm leading-7 text-white/75">
            Coaching gives you session booking, admin feedback, and a deeper accountability layer inside CLARA.
          </p>
          <Button className="mt-4" onClick={() => navigate("/enroll")}>
            Unlock Coaching
          </Button>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!form.date || !form.topic || !user?.email) return;

    try {
      setSaving(true);
      setErrorText("");

      const payload = {
        user_id: user.id,
        created_by: user.email,
        user_name: user.full_name || user.email,
        date: form.date,
        time: form.time,
        topic: form.topic.trim(),
        notes: form.notes.trim() || null,
        status: "pending",
        session_name: null,
        admin_notes: null,
      };

      const { data, error } = await supabase
        .from("coaching_requests")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setRequests((prev) => [data, ...prev]);
      setForm({ date: "", time: "9:00 AM", topic: "", notes: "" });
      setOpen(false);
    } catch (error) {
      console.error("Failed to submit coaching request:", error);
      const message = formatSupabaseError(error, "Failed to submit coaching request.");
      setErrorText(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    approved: "bg-green-100 text-green-700 border border-green-200",
    rejected: "bg-red-100 text-red-700 border border-red-200",
    completed: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      const isUrl = /^https?:\/\/[^\s]+$/.test(part);

      if (isUrl) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2 break-all"
          >
            Open session link
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      }

      return (
        <span key={index} className="whitespace-pre-wrap break-words">
          {part}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Coaching"
        subtitle="Book a 1-on-1 session"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Book
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book Coaching Session</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Preferred Time</Label>
                  <Select value={form.time} onValueChange={(value) => setForm({ ...form, time: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Topic</Label>
                  <Input
                    placeholder="What would you like help with?"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Any additional details..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={saving || !form.date || !form.topic}
                >
                  {saving ? "Requesting..." : "Request Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {errorText ? <p className="mb-4 text-sm text-red-400">{errorText}</p> : null}

      {requests.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No coaching sessions"
          description="Book your first session to get personalized financial guidance."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-card rounded-2xl border border-border p-4 md:p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-base break-words">{request.topic}</p>
                  {request.session_name ? (
                    <p className="text-sm text-primary font-medium mt-1">{request.session_name}</p>
                  ) : null}
                </div>

                <span
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium capitalize ${
                    statusColors[request.status] ||
                    "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {request.status || "pending"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {request.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {request.time}
                </span>
              </div>

              {request.notes ? (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {request.notes}
                  </p>
                </div>
              ) : null}

              {request.admin_notes ? (
                <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Coach Response</span>
                  </div>

                  <div className="text-sm leading-7 text-foreground whitespace-pre-wrap break-words space-y-2">
                    {renderFormattedText(request.admin_notes)}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
