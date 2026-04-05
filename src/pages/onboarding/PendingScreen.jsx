export default function PendingScreen() {
  return (
    <div className="min-h-screen bg-[#061018] text-white px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">Payment Under Review</h1>
        <p className="text-white/75 leading-7">
          Your payment is currently being verified. Once approved, you’ll be
          moved to the next onboarding step automatically.
        </p>
      </div>
    </div>
  );
}