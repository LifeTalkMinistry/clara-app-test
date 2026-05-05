import { Home, MessageCircle, Settings, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Feed", to: "/feed", icon: UsersRound },
  { label: "Messages", to: "/messages", icon: MessageCircle },
  { label: "Settings", to: "/settings/account", icon: Settings },
];

export default function TopNav() {
  return (
    <div className="sticky top-0 z-[80] -mx-4 mb-3 px-4 pt-[calc(env(safe-area-inset-top)+0.35rem)]">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-[390px] items-center justify-between gap-1 rounded-[28px] border border-white/10 bg-white/[0.06] px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-[24px]"
      >
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold transition active:scale-95 ${
                isActive
                  ? "bg-white/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
                  : "text-white/48 hover:bg-white/[0.06] hover:text-white/80"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full border transition ${
                    isActive
                      ? "border-cyan-200/25 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                      : "border-white/5 bg-black/10 text-white/55 group-hover:text-white/80"
                  }`}
                >
                  <Icon size={17} strokeWidth={2.35} />
                </span>
                <span className="truncate leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
