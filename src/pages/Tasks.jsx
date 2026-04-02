import { useState, useEffect } from "react";
import { CheckCircle, Circle, ListChecks, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ChallengeModal from "../components/ChallengeModal";
import useUserRole from "../hooks/useUserRole";

export default function Tasks() {
  const { user, isPaid } = useUserRole();

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user?.email) return;

    Promise.all([
      fetch("/api/tasks").then(r => r.json()),
      fetch(`/api/task-submissions?email=${user.email}`).then(r => r.json()),
    ])
      .then(([t, s]) => {
        setTasks(t || []);
        setSubmissions(s || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  const getSubmission = (taskId) =>
    submissions.find(s => s.task_id === taskId);

  const handleSubmitted = (sub) => {
    setSubmissions(prev => [...prev, sub]);
  };

  if (!isPaid) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EmptyState icon={ListChecks} title="Tasks locked" />
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      <PageHeader title="Tasks" />

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
                className="p-4 border rounded-xl flex items-center gap-3"
              >
                {done ? (
                  <CheckCircle className="text-primary w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}

                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>

                  <p className="text-xs text-muted-foreground">
                    Week {task.week}
                  </p>
                </div>

                {!done && (
                  <Button size="sm" onClick={() => setSelected(task)}>
                    <Zap className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
              </div>
            );
          })}

        </div>
      )}

      <ChallengeModal
        task={selected}
        onClose={() => setSelected(null)}
        onSubmitted={handleSubmitted}
        user={user}
      />

    </div>
  );
}