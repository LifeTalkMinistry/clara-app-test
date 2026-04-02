import { useState, useEffect } from "react";
import { Upload, CheckCircle, Clock, XCircle, ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import useUserRole from "../hooks/useUserRole";

const STEPS = ["Select Plan", "Payment", "Upload Proof", "Done"];

export default function Enroll() {
  const { user } = useUserRole();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");

  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({});
  const [referralCode, setReferralCode] = useState("");

  // referral
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) setReferralCode(code);
  }, []);

  // load data
  useEffect(() => {
    if (!user?.email) return;

    Promise.all([
      fetch("/api/plans").then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
      fetch(`/api/enrollment?email=${user.email}`).then(r => r.json()),
    ])
      .then(([p, settings, enrollments]) => {
        setPlans((p || []).filter(plan => plan.plan_key !== "free"));
        setPaymentSettings(settings || {});
        if (enrollments?.length) setEnrollment(enrollments[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!proofFile || !selectedPlan) return;

    setSubmitting(true);

    const formData = new FormData();
    formData.append("file", proofFile);
    formData.append("plan", selectedPlan.plan_key);
    formData.append("payment_method", paymentMethod);
    formData.append("amount_paid", selectedPlan.price);
    formData.append("email", user.email);
    formData.append("referral_code", referralCode || "");

    const res = await fetch("/api/enroll", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setEnrollment(data);
    setSubmitting(false);
    setStep(3);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* STEP INDICATOR */}
      <div className="flex gap-2 mb-4">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">{STEPS[step]}</h2>

      {/* STEP 0 */}
      {step === 0 && (
        <div className="space-y-4">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`w-full p-4 border rounded-xl text-left ${
                selectedPlan?.id === plan.id ? "border-primary" : ""
              }`}
            >
              <p className="font-bold">{plan.name}</p>
              <p className="text-sm">₱{plan.price}</p>
            </button>
          ))}

          <Button disabled={!selectedPlan} onClick={() => setStep(1)}>
            Continue
          </Button>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">

          <div>
            <Label>Payment Method</Label>
            <div className="flex gap-2 mt-2">
              {["gcash", "bank"].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 p-2 border rounded ${
                    paymentMethod === m ? "border-primary" : ""
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-xl text-sm">
            {paymentMethod === "gcash" ? (
              <>
                <p>{paymentSettings.gcash_number || "09858410403"}</p>
                <p>{paymentSettings.gcash_name || "Jerome Mirabuenos"}</p>
              </>
            ) : (
              <>
                <p>{paymentSettings.bank_name || "Security Bank"}</p>
                <p>{paymentSettings.bank_account}</p>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">

          <Input type="file" accept="image/*" onChange={handleFile} />

          {proofPreview && (
            <img src={proofPreview} className="max-h-40 rounded" />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!proofFile || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>

        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
          <p>Enrollment submitted!</p>

          <Button className="mt-4" onClick={() => navigate("/dashboard")}>
            Go Dashboard
          </Button>
        </div>
      )}

    </div>
  );
}