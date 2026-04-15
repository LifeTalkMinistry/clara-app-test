export default function PendingScreen() {
  return (
    <div className="min-h-screen bg-[#061018] px-6 py-10 text-white flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
        <h1 className="mb-4 text-3xl font-bold">Purchase Processing</h1>
        <p className="leading-7 text-white/75">
          Your unlock is being processed. Once CLARA confirms the entitlement,
          you will be moved to the next onboarding step automatically.
        </p>
      </div>
    </div>
  );
}
