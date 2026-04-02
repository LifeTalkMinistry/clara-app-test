import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TierSelect() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/plans")
      .then(r => r.json())
      .then(p => {
        setPlans(p?.length ? p : DEFAULT_PLANS);
        setLoading(false);
      })
      .catch(() => {
        setPlans(DEFAULT_PLANS);
        setLoading(false);
      });
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
        <h1 className="text-3xl font-bold text-white">
          Choose Your Path
        </h1>
        <p className="text-green-100 text-sm mt-2">
          Select your plan
        </p>
      </div>

      <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">

        <div className="grid gap-6">

          {/* FREE */}
          <div>
            <button
              onClick={handleFree}
              className="w-full p-6 rounded-2xl border bg-white"
            >
              <p className="font-bold text-lg">Free</p>
              <p className="text-2xl font-bold text-primary">₱0</p>

              <div className="mt-4 space-y-2">
                {freePlan.features?.map((f, i) => (
                  <p key={i} className="text-sm flex gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    {f}
                  </p>
                ))}
              </div>

              <Button className="w-full mt-4">
                Continue Free
              </Button>
            </button>
          </div>

          {/* PAID */}
          {paidPlans.map(plan => (
            <div key={plan.plan_key}>
              <button
                onClick={handlePaid}
                className="w-full p-6 rounded-2xl border bg-white"
              >
                <p className="font-bold text-lg">{plan.name}</p>
                <p className="text-2xl font-bold text-primary">
                  ₱{plan.price}
                </p>

                <div className="mt-4 space-y-2">
                  {plan.features?.map((f, i) => (
                    <p key={i} className="text-sm flex gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      {f}
                    </p>
                  ))}
                </div>

                <Button className="w-full mt-4">
                  {plan.cta_label || "Enroll"}
                </Button>
              </button>
            </div>
          ))}

        </div>

        <div className="flex justify-center mt-6">
          <Link to="/dashboard">
            <Button variant="ghost">
              Skip
            </Button>
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
    features: ["Tasks", "Modules"],
  },
  {
    plan_key: "transformation",
    name: "Transformation",
    price: 999,
    features: ["Coaching", "Priority support"],
  },
];