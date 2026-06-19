import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClaraLogo from "@/components/ClaraLogo";

export default function AppPreview() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#050716_0%,#070a1f_44%,#02030b_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(139,92,246,0.18),transparent_34%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClaraLogo variant="icon" theme="dark" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/55">
                CLARA UI Preview
              </p>
              <h1 className="text-lg font-bold text-white">Dashboard preview</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close CLARA UI preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,18,38,0.76)_0%,rgba(5,8,22,0.72)_100%)] p-4 shadow-[0_24px_78px_rgba(0,0,0,0.52)] backdrop-blur-2xl">
          <div className="rounded-[26px] border border-cyan-300/12 bg-cyan-300/[0.055] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/62">
              Money awareness
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">₱0.00</h2>
            <p className="mt-1 text-sm text-white/52">Preview balance shown for testers</p>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-full w-[58%] rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
              <p className="text-[11px] text-white/45">Budget</p>
              <p className="mt-1 text-base font-semibold text-white">Plan first</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
              <p className="text-[11px] text-white/45">Income Hub</p>
              <p className="mt-1 text-base font-semibold text-white">Track flow</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
              <p className="text-[11px] text-white/45">Savings</p>
              <p className="mt-1 text-base font-semibold text-white">Build safety</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
              <p className="text-[11px] text-white/45">CLARA Coach</p>
              <p className="mt-1 text-base font-semibold text-white">Ask first</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">Preview note</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              This screen lets testers see the CLARA interface during maintenance. It does not connect to Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
