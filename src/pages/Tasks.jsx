import { useState, useEffect } from "react";
import {
  CheckCircle,
  Circle,
  ListChecks,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ChallengeModal from "../components/ChallengeModal";
import useUserRole from "../hooks/useUserRole";

const TASKS_KEY = "clara_tasks";
const SUBMISSIONS_KEY = "clara_task_submissions";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const safeWrite = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

function StatusBadge({ sub }) {
  if (!sub) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
        Not Started
      </span>
    );
  }

  const map = {
    submitted: "bg-secondary/20 text-secondary",
    reviewed: "bg-blue-500/10 text-blue-400",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive"
  };

  const labels = {
    submitted: "Submitted",
    reviewed: "Reviewed",
    approved: "Approved ✓",
    rejected: "Rejected"
  };

  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", map[sub.status])}>
      {labels[sub.status] || "Submitted"}
    </span>
  );
}

export default function Tasks() {
  const { user, isPaid } = useUserRole();

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!user?.email) return;

    const allTasks = safeRead(TASKS_KEY);
    const allSubs = safeRead(SUBMISSIONS_KEY);

    setTasks(allTasks);
    setSubmissions(allSubs.filter(s => s.created_by === user.email));

    setLoading(false);
  }, [user?.email]);

  const getSubmission = (taskId) =>
    submissions.find(s => s.task_id === taskId);

  const handleSubmitted = (sub) => {
    const updated = [...submissions, sub];
    setSubmissions(updated);
    safeWrite(SUBMISSIONS_KEY, updated);
  };

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={ListChecks}
          title="Tasks are for paid members"
          description="Upgrade to access challenge tasks."
        />
      </div>
    );
  }

  if (loading) {
    return <div className="h-64 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-10">
      <PageHeader
        title="Daily Challenge Tasks"
        subtitle={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
      />

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks yet" />
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const sub = getSubmission(task.id);
            const done = !!sub;

            return (
              <div
                key={task.id}
                className={cn(
                  "rounded-2xl p-4 border transition-all",
                  done ? "bg-muted border-border" : "bg-card border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={done ? "text-primary" : "text-muted-foreground"}>
                    {done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-semibold text-sm">{task.title}</p>
                      <StatusBadge sub={sub} />
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {task.main_action_instruction || "Complete this task"}
                    </p>

                    {done && sub && (
                      <div>
                        <button
                          onClick={() =>
                            setExpanded(prev => ({
                              ...prev,
                              [task.id]: !prev[task.id]
                            }))
                          }
                          className="text-xs text-muted-foreground"
                        >
                          {expanded[task.id] ? "Hide" : "View"} submission
                        </button>

                        {expanded[task.id] && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            {sub.content || "No content"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!done && (
                    <Button size="sm" onClick={() => setSelected(task)}>
                      <Zap className="w-3.5 h-3.5 mr-1" /> Start
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ChallengeModal
        task={selected}
        onClose={() => setSelected(null)}
        onSubmitted={(sub) => handleSubmitted({ ...sub, created_by: user.email })}
        user={user}
      />
    </div>
  );
}