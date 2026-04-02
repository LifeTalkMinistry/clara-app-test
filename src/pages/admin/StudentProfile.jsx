import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Target,
  ListChecks,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Edit3,
  Save,
  X,
  Shield,
  DollarSign,
  BarChart2,
  Share2,
  FileText,
  ExternalLink,
  Pause,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useUserRole from "../../hooks/useUserRole";

// 👉 TEMP API WRAPPER (replace later with real backend)
const api = {
  get: async () => [],
  create: async () => ({}),
  update: async () => ({}),
};

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

export default function StudentProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user: adminUser } = useUserRole();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (!userId || !isAdmin) return;
    loadAll();
  }, [userId, isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    setLoadError(false);

    try {
      // 👉 Replace later with real API
      const data = await api.get();

      setStudent(data?.student || null);
      setExpenses(data?.expenses || []);
      setIncomes(data?.incomes || []);
      setTasks(data?.tasks || []);
      setSubmissions(data?.submissions || []);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }

    setLoading(false);
  };

  // ======================
  // COMPUTED DATA
  // ======================

  const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const completedTasks = submissions.length;
  const pendingTasks = tasks.length - completedTasks;

  // ======================
  // GUARDS
  // ======================

  if (!isAdmin) {
    return <div className="p-6 text-center">Admin only</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 text-center">
        <p>Error loading data</p>
        <button onClick={loadAll}>Retry</button>
      </div>
    );
  }

  if (!student) {
    return <div className="p-6 text-center">No student found</div>;
  }

  // ======================
  // UI
  // ======================

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* HEADER */}
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-2 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-xl font-bold mb-2">
        {student.full_name || "No Name"}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">{student.email}</p>

      {/* NAV */}
      <div className="flex gap-2 mb-6">
        {["overview", "financial", "tasks"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={`px-3 py-1 rounded ${
              activeSection === tab ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSection === "overview" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card p-3 rounded-xl">
            <p className="text-xs">Plan</p>
            <p className="font-bold">{student.plan || "free"}</p>
          </div>

          <div className="bg-card p-3 rounded-xl">
            <p className="text-xs">Role</p>
            <p className="font-bold">{student.role}</p>
          </div>
        </div>
      )}

      {/* FINANCIAL */}
      {activeSection === "financial" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card p-3 rounded-xl">
            <p className="text-xs">Income</p>
            <p className="font-bold text-primary">{fmt(totalIncome)}</p>
          </div>

          <div className="bg-card p-3 rounded-xl">
            <p className="text-xs">Expenses</p>
            <p className="font-bold text-destructive">{fmt(totalExpenses)}</p>
          </div>

          <div className="bg-card p-3 rounded-xl">
            <p className="text-xs">Balance</p>
            <p className="font-bold">{fmt(balance)}</p>
          </div>
        </div>
      )}

      {/* TASKS */}
      {activeSection === "tasks" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-card p-3 rounded-xl">
              <p className="text-xs">Total</p>
              <p className="font-bold">{tasks.length}</p>
            </div>

            <div className="bg-card p-3 rounded-xl">
              <p className="text-xs">Done</p>
              <p className="font-bold text-primary">{completedTasks}</p>
            </div>

            <div className="bg-card p-3 rounded-xl">
              <p className="text-xs">Pending</p>
              <p className="font-bold text-orange-500">{pendingTasks}</p>
            </div>
          </div>

          {tasks.map((t) => (
            <div key={t.id} className="p-3 border rounded-lg mb-2">
              <p className="font-medium">{t.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}