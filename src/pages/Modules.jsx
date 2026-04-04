import { useState, useEffect } from "react";
import {
  BookOpen,
  Lock,
  ChevronRight,
  Download,
  Play,
  CheckCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import ReactMarkdown from "react-markdown";

const MODULES_KEY = "clara_modules";
const MODULE_PROGRESS_KEY = "clara_module_progress";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function VideoPlayer({ url }) {
  if (!url) return null;

  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
  );

  if (ytMatch) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden mb-4">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full"
          allowFullScreen
          title="Module video"
        />
      </div>
    );
  }

  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return (
      <div className="mb-4">
        <video controls className="w-full rounded-xl" src={url} />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm font-medium mb-4 hover:bg-primary/20 transition-colors"
    >
      <Play className="w-4 h-4" /> Watch Video
    </a>
  );
}

const STATUS_CONFIG = {
  not_started: {
    label: "Not Started",
    color: "text-muted-foreground bg-muted",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    color: "text-accent bg-accent/10",
    icon: Play,
  },
  completed: {
    label: "Completed",
    color: "text-primary bg-primary/10",
    icon: CheckCircle,
  },
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

    const allModules = safeRead(MODULES_KEY);
    const allProgress = safeRead(MODULE_PROGRESS_KEY);

    const publishedModules = allModules
      .filter((m) => m.is_published === true && m.is_activated === true)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 50);

    const userProgress = allProgress.filter((p) => p.user_email === user.email);
    const progressMap = {};

    userProgress.forEach((pr) => {
      progressMap[pr.module_id] = pr;
    });

    setModules(publishedModules);
    setProgress(progressMap);
    setLoading(false);
  }, [user?.email, isPaid]);

  const startDate = user?.challenge_start_date
    ? new Date(user.challenge_start_date)
    : new Date();

  const currentWeek = Math.min(
    4,
    Math.max(
      1,
      Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000))
    )
  );

  const openModule = async (mod, locked) => {
    if (locked || !user?.email) return;

    setSelected(mod);
    const existing = progress[mod.id];
    setSelectedProgress(existing || null);

    if (!existing) {
      setSaving(true);

      const allProgress = safeRead(MODULE_PROGRESS_KEY);
      const record = {
        id: generateId(),
        module_id: mod.id,
        user_email: user.email,
        status: "in_progress",
        started_at: new Date().toISOString(),
      };

      const updatedAllProgress = [...allProgress, record];
      safeWrite(MODULE_PROGRESS_KEY, updatedAllProgress);

      setProgress((prev) => ({ ...prev, [mod.id]: record }));
      setSelectedProgress(record);
      setSaving(false);
    }
  };

  const markCompleted = async () => {
    if (!selected || !user?.email) return;

    setSaving(true);

    const allProgress = safeRead(MODULE_PROGRESS_KEY);
    const existing = progress[selected.id];
    let record;

    if (existing) {
      record = {
        ...existing,
        status: "completed",
        completed_at: new Date().toISOString(),
      };

      const updatedAllProgress = allProgress.map((item) =>
        item.id === existing.id ? record : item
      );

      safeWrite(MODULE_PROGRESS_KEY, updatedAllProgress);
    } else {
      record = {
        id: generateId(),
        module_id: selected.id,
        user_email: user.email,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const updatedAllProgress = [...allProgress, record];
      safeWrite(MODULE_PROGRESS_KEY, updatedAllProgress);
    }

    setProgress((prev) => ({ ...prev, [selected.id]: record }));
    setSelectedProgress(record);
    setSaving(false);
  };

  const resetProgress = async () => {
    if (!selected) return;

    const existing = progress[selected.id];
    if (!existing) return;

    setSaving(true);

    const allProgress = safeRead(MODULE_PROGRESS_KEY);
    const updatedAllProgress = allProgress.filter(
      (item) => item.id !== existing.id
    );

    safeWrite(MODULE_PROGRESS_KEY, updatedAllProgress);

    setProgress((prev) => {
      const next = { ...prev };
      delete next[selected.id];
      return next;
    });

    setSelectedProgress(null);
    setSaving(false);
  };

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={BookOpen}
          title="Weekly Modules are for paid members"
          description="Upgrade to access the CLARA weekly learning modules."
        />
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
  modules.forEach((m) => {
    if (!grouped[m.week]) grouped[m.week] = [];
    grouped[m.week].push(m);
  });

  const getStatus = (mod) => {
    const p = progress[mod.id];
    if (!p) return "not_started";
    return p.status;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Weekly Modules"
        subtitle="Weekly content unlocked progressively"
      />

      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No modules yet"
          description="Modules will appear here as they're published."
        />
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4].map((week) => {
            const weekModules = grouped[week] || [];
            const weekLocked = week > currentWeek;

            if (weekModules.length === 0) return null;

            const completedCount = weekModules.filter(
              (m) => getStatus(m) === "completed"
            ).length;

            return (
              <div key={week}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      weekLocked ? "bg-muted" : "grad-green"
                    }`}
                  >
                    <span
                      className={`font-heading font-bold text-sm ${
                        weekLocked ? "text-muted-foreground" : "text-white"
                      }`}
                    >
                      {week}
                    </span>
                  </div>

                  <p className="font-heading font-semibold">Week {week}</p>

                  {weekLocked && (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  )}

                  {!weekLocked && (
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{weekModules.length} completed
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {weekModules.map((mod) => {
                    const status = getStatus(mod);
                    const cfg = STATUS_CONFIG[status];
                    const Icon = cfg.icon;

                    return (
                      <button
                        key={mod.id}
                        disabled={weekLocked}
                        onClick={() => openModule(mod, weekLocked)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${
                          weekLocked
                            ? "opacity-50 bg-muted border-border cursor-not-allowed"
                            : status === "completed"
                            ? "bg-primary/5 border-primary/20 hover:shadow-sm"
                            : status === "in_progress"
                            ? "bg-accent/5 border-accent/20 hover:shadow-sm"
                            : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{mod.title}</p>

                            {mod.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {mod.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-1.5">
                              {mod.video_url && (
                                <span className="text-[10px] flex items-center gap-1 text-accent font-medium">
                                  <Play className="w-3 h-3" /> Video
                                </span>
                              )}

                              {mod.resource_url && (
                                <span className="text-[10px] flex items-center gap-1 text-muted-foreground font-medium">
                                  <Download className="w-3 h-3" />{" "}
                                  {mod.resource_label || "Resource"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span
                              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}
                            >
                              <Icon className="w-3 h-3" /> {cfg.label}
                            </span>

                            {!weekLocked && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setSelectedProgress(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {selected?.title}
            </DialogTitle>
            {selected?.description && (
              <p className="text-sm text-muted-foreground">
                {selected.description}
              </p>
            )}
          </DialogHeader>

          {selected &&
            (() => {
              const status = selectedProgress?.status || "in_progress";
              const StatusIcon = STATUS_CONFIG[status].icon;

              return (
                <>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${STATUS_CONFIG[status].color}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {STATUS_CONFIG[status].label}

                    {selectedProgress?.started_at && (
                      <span className="text-xs font-normal ml-auto opacity-70">
                        Started{" "}
                        {new Date(
                          selectedProgress.started_at
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {selected.video_url && <VideoPlayer url={selected.video_url} />}

                  {selected.content && (
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{selected.content}</ReactMarkdown>
                    </div>
                  )}

                  {selected.resource_url && (
                    <a
                      href={selected.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl bg-muted text-sm font-medium mt-2 hover:bg-muted/80 transition-colors"
                    >
                      <Download className="w-4 h-4" />{" "}
                      {selected.resource_label || "Download Resource"}
                    </a>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border mt-2">
                    {status !== "completed" && (
                      <Button
                        className="flex-1"
                        onClick={markCompleted}
                        disabled={saving}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {saving
                          ? "Saving..."
                          : "Done Watching — Mark Completed"}
                      </Button>
                    )}

                    {status === "completed" && (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold">
                          <CheckCircle className="w-4 h-4" />
                          Completed!
                          {selectedProgress?.completed_at && (
                            <span className="text-xs font-normal opacity-70">
                              on{" "}
                              {new Date(
                                selectedProgress.completed_at
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetProgress}
                          disabled={saving}
                          className="text-muted-foreground text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}