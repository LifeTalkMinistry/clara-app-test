import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "clara_plans";

const safeRead = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export default function TierSelect() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = safeRead();
    setPlans(stored.length > 0 ? stored : DEFAULT_PLANS);
    setLoading(false);
  }, []);

  const handleFree = () => navigate("/dashboard");
  const handlePaid = () => navigate("/enroll");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const freePlan = plans.find(p => p.plan_key === "free") || DEFAULT_PLANS[0];
  const paidPlans = plans.filter(p => p.plan_key !== "free");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER */}
      <div className="grad-green px-4 py-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-heading font-bold text-4xl">C</span>
        </div>

        <h1 className="font-heading text-3xl font-bold text-white">
          Choose Your Path
        </h1>
        <p className="text-green-100 text-sm mt-2">
          Select the tier that fits your journey
        </p>
      </div>

      <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* FREE */}
          <div>
            <button
              onClick={handleFree}
              className="w-full p-6 rounded-3xl border-2 bg-white hover:shadow-lg transition-all"
            >
              <div className="flex justify-between mb-4">
                <p className="font-bold text-lg">Free</p>
                <span className="text-3xl font-bold text-primary">₱0</span>
              </div>

              <div className="space-y-2 mb-4">
                {freePlan.features?.slice(0, 3).map((f, i) => (
                  <p key={i} className="text-xs flex gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    {f}
                  </p>
                ))}
              </div>

              <button className="w-full py-2 border rounded-full text-primary">
                Continue Free
              </button>
            </button>
          </div>

          {/* PAID */}
          {paidPlans.map((plan, i) => {
            const isPremium = plan.is_popular;

            return (
              <div key={i}>
                <button
                  onClick={handlePaid}
                  className={`w-full p-6 rounded-3xl border-2 transition-all ${
                    isPremium
                      ? "border-primary shadow-xl"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-bold text-lg">{plan.name}</p>

                  <p className="text-3xl font-bold text-primary mt-2">
                    ₱{plan.price}
                  </p>

                  <div className="space-y-2 mt-4">
                    {plan.features?.slice(0, 3).map((f, j) => (
                      <p key={j} className="text-xs flex gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        {f}
                      </p>
                    ))}
                  </div>

                  <button className="w-full mt-4 py-2 bg-primary text-white rounded-full">
                    {plan.cta_label || "Enroll"}
                  </button>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <Link to="/dashboard">
            <Button variant="ghost">Skip for now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PLANS = [
  {
    plan_key: "free",
    name: "Free",
    price: 0,
    features: ["Expense tracking", "Wallets", "Basic analytics"],
  },
  {
    plan_key: "basic",
    name: "Basic",
    price: 499,
    features: ["Daily tasks", "Modules", "Tracking"],
    is_popular: true,
  },
  {
    plan_key: "transformation",
    name: "Transformation",
    price: 999,
    features: ["Everything in Basic", "Coaching", "Priority support"],
  },
];