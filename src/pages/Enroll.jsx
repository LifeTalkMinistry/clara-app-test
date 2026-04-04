import { useState, useEffect } from "react";
import {
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import useUserRole from "../hooks/useUserRole";

const STEPS = ["Select Plan", "Payment", "Upload Proof", "Done"];

const STORAGE_KEYS = {
  plans: "clara_plans",
  appSettings: "clara_app_settings",
  enrollments: "clara_enrollments",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function Enroll() {
  const { user } = useUserRole();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) setReferralCode(code);
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const allPlans = getStoredData(STORAGE_KEYS.plans);
    const allSettings = getStoredData(STORAGE_KEYS.appSettings);
    const allEnrollments = getStoredData(STORAGE_KEYS.enrollments);

    const activePlans = allPlans
      .filter((plan) => plan.is_active)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const paidPlans = activePlans.filter((plan) => plan.plan_key !== "free");
    setPlans(paidPlans);

    const settingsMap = {};
    allSettings.forEach((s) => {
      if (s?.key) settingsMap[s.key] = s.value;
    });
    setPaymentSettings(settingsMap);

    const latestEnrollment = allEnrollments
      .filter((e) => e.created_by === user.email)
      .sort((a, b) => {
        const aDate = new Date(a.created_date || a.created_at || 0).getTime();
        const bDate = new Date(b.created_date || b.created_at || 0).getTime();
        return bDate - aDate;
      })[0];

    if (latestEnrollment) setEnrollment(latestEnrollment);

    setLoading(false);
  }, [user?.email]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const reader = new FileReader();

      reader.onloadend = () => {
        setProofUrl(reader.result);
        setUploading(false);
      };

      reader.onerror = () => {
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!proofUrl || !selectedPlan || !user?.email) return;

    setSubmitting(true);

    const allEnrollments = getStoredData(STORAGE_KEYS.enrollments);

    const newEnrollment = {
      id: generateId(),
      created_by: user.email,
      created_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      plan: selectedPlan.plan_key,
      payment_method: paymentMethod,
      proof_url: proofUrl,
      status: "pending",
      amount_paid: selectedPlan.price,
      referral_code: referralCode || null,
      admin_notes: "",
    };

    const updatedEnrollments = [newEnrollment, ...allEnrollments];
    setStoredData(STORAGE_KEYS.enrollments, updatedEnrollments);

    setEnrollment(newEnrollment);
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

  const isPaidUser =
    ["basic", "transformation", "elite", "student"].includes(user?.plan) ||
    user?.role === "paid_user";

  if (isPaidUser && user?.challenge_start_date) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  if (enrollment && step !== 3) {
    const statusMap = {
      pending: {
        icon: Clock,
        color: "text-secondary-foreground",
        label: "Pending Review",
        bg: "bg-secondary/20 border-secondary/40",
      },
      under_review: {
        icon: Clock,
        color: "text-accent",
        label: "Under Review",
        bg: "bg-accent/10 border-accent/30",
      },
      approved: {
        icon: CheckCircle,
        color: "text-primary",
        label: "Approved! 🎉",
        bg: "bg-primary/10 border-primary/30",
      },
      rejected: {
        icon: XCircle,
        color: "text-destructive",
        label: "Rejected",
        bg: "bg-destructive/10 border-destructive/30",
      },
    };

    const s = statusMap[enrollment.status] || statusMap.pending;

    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <div className={`rounded-2xl p-6 border-2 text-center ${s.bg}`}>
          <s.icon className={`w-14 h-14 mx-auto mb-3 ${s.color}`} />
          <p className={`font-heading text-2xl font-bold ${s.color}`}>
            {s.label}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Plan: <strong>{enrollment.plan}</strong> • ₱
            {enrollment.amount_paid} via {enrollment.payment_method}
          </p>

          {enrollment.admin_notes && (
            <div className="mt-4 p-3 rounded-xl bg-white text-left text-sm">
              <p className="font-medium mb-1">Admin Message:</p>
              <p className="text-muted-foreground">{enrollment.admin_notes}</p>
            </div>
          )}

          {enrollment.status === "approved" && (
            <Button
              className="mt-5 w-full"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          )}

          {enrollment.status === "rejected" && (
            <Button
              className="mt-5 w-full"
              onClick={() => {
                setEnrollment(null);
                setStep(0);
                setProofUrl("");
              }}
            >
              Try Again
            </Button>
          )}

          {(enrollment.status === "pending" ||
            enrollment.status === "under_review") && (
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 className="font-heading text-2xl font-bold mb-5">{STEPS[step]}</h2>

      {step === 0 && (
        <div
          className="-mx-6 -my-6 px-6 py-12 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #064E3B 100%)",
          }}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm col-span-full">
                No plans available. Contact admin.
              </div>
            ) : (
              plans.map((plan, idx) => {
                const isRecommended = plan.is_popular || idx === 1;

                const borderColors = {
                  basic: "border-primary",
                  transformation: "border-yellow-400",
                  elite: "border-blue-400",
                  student: "border-primary",
                };

                const priceColors = {
                  basic: "text-primary",
                  transformation: "text-yellow-600",
                  elite: "text-blue-600",
                  student: "text-primary",
                };

                const border = borderColors[plan.plan_key] || "border-primary";
                const priceColor =
                  priceColors[plan.plan_key] || "text-primary";

                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`text-left p-8 rounded-[20px] border-2 transition-all relative flex flex-col h-full bg-white ${
                      isRecommended && selectedPlan?.id === plan.id
                        ? "border-yellow-400 shadow-2xl hover:shadow-2xl hover:-translate-y-2 scale-100 lg:scale-[1.08] ring-2 ring-yellow-300/50"
                        : selectedPlan?.id === plan.id
                        ? border +
                          " shadow-xl hover:shadow-2xl hover:-translate-y-2"
                        : border + " shadow-lg hover:shadow-xl hover:-translate-y-1"
                    }`}
                    style={
                      isRecommended && selectedPlan?.id === plan.id
                        ? { boxShadow: "0 20px 40px rgba(234, 179, 8, 0.3)" }
                        : {}
                    }
                  >
                    {isRecommended && selectedPlan?.id !== plan.id && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white grad-green shadow-md">
                          RECOMMENDED
                        </span>
                      </div>
                    )}

                    {isRecommended && selectedPlan?.id === plan.id && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white grad-green shadow-md">
                          SELECTED
                        </span>
                      </div>
                    )}

                    <div className="pb-6">
                      <p
                        className={cn(
                          "font-heading font-bold mb-2 text-slate-900",
                          isRecommended ? "text-2xl" : "text-xl"
                        )}
                      >
                        {plan.name}
                      </p>

                      <div className="mb-6">
                        <p
                          className={cn(
                            "font-heading font-bold leading-tight mb-3",
                            isRecommended ? "text-5xl" : "text-4xl",
                            priceColor
                          )}
                        >
                          ₱{plan.price}
                        </p>
                        {plan.description && (
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="space-y-4 mb-8 flex-1">
                        {plan.features.map((f, i) => (
                          <li
                            key={i}
                            className="text-sm text-slate-800 flex items-start gap-3 font-medium"
                          >
                            <CheckCircle
                              className="w-5 h-5 flex-shrink-0 mt-0.5"
                              style={{
                                color: priceColor.includes("yellow")
                                  ? "#EAB308"
                                  : priceColor.includes("blue")
                                  ? "#2563EB"
                                  : "#22C55E",
                              }}
                            />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      className={cn(
                        "w-full py-3 px-6 rounded-full font-bold text-sm transition-all duration-300",
                        selectedPlan?.id === plan.id
                          ? isRecommended
                            ? "text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            : "text-white shadow-md hover:shadow-lg"
                          : "border-2 bg-white hover:bg-opacity-90"
                      )}
                      style={
                        selectedPlan?.id === plan.id
                          ? isRecommended
                            ? {
                                background:
                                  "linear-gradient(135deg, #EAB308 0%, #FACC15 100%)",
                              }
                            : plan.plan_key === "transformation"
                            ? {
                                background:
                                  "linear-gradient(135deg, #CA8A04 0%, #EAB308 100%)",
                              }
                            : plan.plan_key === "elite"
                            ? {
                                background:
                                  "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
                              }
                            : {
                                background:
                                  "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                              }
                          : {
                              borderColor: priceColor.includes("yellow")
                                ? "#EAB308"
                                : priceColor.includes("blue")
                                ? "#2563EB"
                                : "#22C55E",
                              color: priceColor.includes("yellow")
                                ? "#CA8A04"
                                : priceColor.includes("blue")
                                ? "#2563EB"
                                : "#16A34A",
                            }
                      }
                    >
                      {selectedPlan?.id === plan.id ? "Selected" : "Select Plan"}
                    </button>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="mt-8 flex justify-center">
          <Button
            disabled={!selectedPlan}
            onClick={() => setStep(1)}
            size="lg"
            className="px-8"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {["gcash", "bank"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all",
                    paymentMethod === m
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card"
                  )}
                >
                  {m === "gcash" ? "📱 GCash" : "🏦 Bank Transfer"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Payment Details
            </p>

            {paymentMethod === "gcash" ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number:</span>
                  <span className="font-semibold">
                    {paymentSettings?.gcash_number || "09858410403"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold">
                    {paymentSettings?.gcash_name || "Jerome Mirabuenos"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-primary">
                    ₱{selectedPlan?.price}
                  </span>
                </div>
                {paymentSettings?.gcash_qr_url && (
                  <img
                    src={paymentSettings.gcash_qr_url}
                    alt="GCash QR"
                    className="mt-3 max-h-48 mx-auto rounded-xl"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-semibold">
                    {paymentSettings?.bank_name || "Security Bank"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-semibold">
                    {paymentSettings?.bank_account || "000-006-704-2019"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold">
                    {paymentSettings?.bank_holder || "CLARA Financial Program"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-primary">
                    ₱{selectedPlan?.price}
                  </span>
                </div>
                {paymentSettings?.bank_qr_url && (
                  <img
                    src={paymentSettings.bank_qr_url}
                    alt="Bank QR"
                    className="mt-3 max-h-48 mx-auto rounded-xl"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(0)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button className="flex-1" onClick={() => setStep(2)}>
              I've Paid
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
            {proofUrl ? (
              <div>
                <CheckCircle className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-sm text-primary font-semibold mb-2">
                  Proof uploaded!
                </p>
                <img
                  src={proofUrl}
                  alt="Payment proof"
                  className="max-h-48 mx-auto rounded-xl mb-3"
                />
                <button
                  onClick={() => setProofUrl("")}
                  className="text-xs text-muted-foreground underline"
                >
                  Remove & re-upload
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Upload payment screenshot or photo
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG supported
                </p>
              </>
            )}

            {!proofUrl && (
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-3"
                disabled={uploading}
              />
            )}

            {uploading && (
              <p className="text-xs text-muted-foreground mt-2">Uploading...</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!proofUrl || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Submit"}
              {!submitting && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h3 className="font-heading text-2xl font-bold mb-2">Submitted!</h3>
          <p className="text-muted-foreground text-sm mb-2">
            Your enrollment is under review. We'll notify you once approved.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Plan: <strong>{selectedPlan?.name}</strong> • ₱
            {selectedPlan?.price}
          </p>
          {referralCode && (
            <p className="text-xs text-muted-foreground mb-4">
              Referred by: <strong>{referralCode}</strong>
            </p>
          )}
          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}