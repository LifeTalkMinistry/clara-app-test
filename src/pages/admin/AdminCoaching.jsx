import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/admin-panel-utils";

export default function AdminCoaching() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const [errorText, setErrorText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("coaching_requests")
        .select("*")
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
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleUpdate() {
    if (!selected) return;

    try {
      setSaving(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("coaching_requests")
        .update({
          status,
          admin_notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id)
        .select()
        .single();

      if (error) throw error;

      setRequests((prev) => prev.map((item) => (item.id === selected.id ? data : item)));
      setSelected(null);
    } catch (error) {
      console.error("Failed to update coaching request:", error);
      const message = formatSupabaseError(error, "Failed to update coaching request.");
      setErrorText(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  const statusColors = {
    pending: "bg-secondary/20 text-secondary-foreground",
    approved: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
    completed: "bg-muted text-muted-foreground",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{requests.length} coaching requests</p>
          {errorText ? <p className="mt-1 text-sm text-red-400">{errorText}</p> : null}
        </div>

        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          No coaching requests found.
        </div>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card rounded-xl border"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{request.user_name || request.created_by || "Unknown User"}</p>
              <p className="text-xs text-muted-foreground">
                {request.topic || "No topic"} • {request.date || "No date"} at {request.time || "No time"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[request.status] || statusColors.pending}`}
              >
                {request.status || "pending"}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelected(request);
                  setStatus(request.status || "pending");
                  setNotes(request.admin_notes || "");
                }}
              >
                <Eye className="w-3 h-3 mr-1" /> Manage
              </Button>
            </div>
          </div>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Coaching Request</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">User:</span> {selected.user_name || selected.created_by || "Unknown User"}</p>
                <p><span className="text-muted-foreground">Topic:</span> {selected.topic || "No topic"}</p>
                <p><span className="text-muted-foreground">Date:</span> {selected.date || "No date"} at {selected.time || "No time"}</p>
                {selected.notes ? (
                  <p><span className="text-muted-foreground">Notes:</span> {selected.notes}</p>
                ) : null}
              </div>

              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              <Button onClick={handleUpdate} className="w-full" disabled={saving}>
                {saving ? "Updating..." : "Update"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
