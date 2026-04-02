import { useState, useEffect } from "react";
import { BookOpen, Lock, ChevronRight, Download, Play, CheckCircle, Clock, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import ReactMarkdown from "react-markdown";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "text-muted-foreground bg-muted", icon: Clock },
  in_progress: { label: "In Progress", color: "text-accent bg-accent/10", icon: Play },
  completed: { label: "Completed", color: "text-primary bg-primary/10", icon: CheckCircle },
};

export default function Modules() {
  const { user, isPaid } = useUserRole();

  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.email || !isPaid) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/modules").then(r => r.json()),
      fetch(`/api/module-progress?email=${user.email}`).then(r => r.json()),
    ])
      .then(([m, p]) => {
        setModules(m || []);

        const map = {};
        (p || []).forEach(pr => {
          map[pr.module_id] = pr;
        });

        setProgress(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email, isPaid]);

  const startDate = user?.challenge_start_date
    ? new Date(user.challenge_start_date)
    : new Date();

  const currentWeek = Math.min(
    4,
    Math.max(1, Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000)))
  );

  const openModule = async (mod, locked) => {
    if (locked) return;

    setSelected(mod);

    const existing = progress[mod.id];
    setSelectedProgress(existing || null);

    if (!existing) {
      setSaving(true);

      const res = await fetch("/api/module-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module_id: mod.id,
          user_email: user.email,
          status: "in_progress",
        }),
      });

      const record = await res.json();

      setProgress(prev => ({ ...prev, [mod.id]: record }));
      setSelectedProgress(record);

      setSaving(false);
    }
  };

  const markCompleted = async () => {
    setSaving(true);

    const res = await fetch("/api/module-progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_id: selected.id,
        user_email: user.email,
        status: "completed",
      }),
    });

    const record = await res.json();

    setProgress(prev => ({ ...prev, [selected.id]: record }));
    setSelectedProgress(record);

    setSaving(false);
  };

  const resetProgress = async () => {
    setSaving(true);

    await fetch(`/api/module-progress/${selected.id}?email=${user.email}`, {
      method: "DELETE",
    });

    setProgress(prev => {
      const copy = { ...prev };
      delete copy[selected.id];
      return copy;
    });

    setSelectedProgress(null);
    setSaving(false);
  };

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState icon={BookOpen} title="Modules are locked" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = {};
  modules.forEach(m => {
    if (!grouped[m.week]) grouped[m.week] = [];
    grouped[m.week].push(m);
  });

  const getStatus = (mod) => {
    const p = progress[mod.id];
    return p?.status || "not_started";
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      <PageHeader title="Modules" />

      <div className="space-y-6">
        {[1,2,3,4].map(week => {
          const weekModules = grouped[week] || [];
          if (!weekModules.length) return null;

          const locked = week > currentWeek;

          return (
            <div key={week}>
              <div className="flex items-center gap-2 mb-3">
                <p className="font-bold">Week {week}</p>
                {locked && <Lock className="w-3 h-3" />}
              </div>

              <div className="space-y-2">
                {weekModules.map(mod => {
                  const status = getStatus(mod);
                  const cfg = STATUS_CONFIG[status];

                  return (
                    <button
                      key={mod.id}
                      disabled={locked}
                      onClick={() => openModule(mod, locked)}
                      className="w-full p-4 border rounded-xl text-left"
                    >
                      <p className="font-medium">{mod.title}</p>

                      <span className={`text-xs px-2 py-1 rounded ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">

          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">

              {selected.video_url && (
                <iframe
                  src={selected.video_url}
                  className="w-full aspect-video"
                />
              )}

              {selected.content && (
                <ReactMarkdown>{selected.content}</ReactMarkdown>
              )}

              {selected.resource_url && (
                <a href={selected.resource_url} target="_blank">
                  <Download className="w-4 h-4 inline mr-1" />
                  Download
                </a>
              )}

              <div className="flex gap-2">
                <Button onClick={markCompleted}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>

                <Button variant="ghost" onClick={resetProgress}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>

            </div>
          )}

        </DialogContent>
      </Dialog>

    </div>
  );
}