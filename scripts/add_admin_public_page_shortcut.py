from pathlib import Path

community_path = Path("src/pages/Community.jsx")
login_path = Path("src/pages/Login.jsx")

community = community_path.read_text(encoding="utf-8")
login = login_path.read_text(encoding="utf-8")

old_import = '''  Bell,\n  CalendarDays,\n  House,'''
new_import = '''  Bell,\n  CalendarDays,\n  Globe2,\n  House,'''
if old_import not in community:
    raise SystemExit("Community lucide import anchor not found")
community = community.replace(old_import, new_import, 1)

old_orb = ''') : activeView === "orb" ? (\n        <ClaraOrbPage />\n      ) : activeView === "home" ? ('''
new_orb = ''') : activeView === "orb" ? (\n        <>\n          <ClaraOrbPage />\n          {isAdmin ? (\n            <button\n              type="button"\n              onClick={() => navigate("/login?mode=landing")}\n              className="fixed right-4 top-[calc(env(safe-area-inset-top)+78px)] z-[96] inline-flex h-9 items-center gap-2 rounded-full border border-cyan-200/15 bg-[#071329]/80 px-3 text-[11px] font-bold text-cyan-50/75 shadow-[0_10px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-cyan-200/30 hover:bg-[#0a1b38]/90 hover:text-white active:scale-[0.98]"\n              aria-label="Open CLARA public landing page"\n              title="View the public CLARA page"\n              data-clara-admin-public-page-shortcut\n            >\n              <Globe2 className="h-3.5 w-3.5 text-cyan-200/70" aria-hidden="true" />\n              <span>Public Page</span>\n            </button>\n          ) : null}\n        </>\n      ) : activeView === "home" ? ('''
if old_orb not in community:
    raise SystemExit("Community Orb render anchor not found")
community = community.replace(old_orb, new_orb, 1)

old_login = '''  const initialMode =\n    requestedMode === "signup"\n      ? "signup"\n      : requestedMode === "login" || location.state?.from\n        ? "login"\n        : "landing";'''
new_login = '''  const initialMode =\n    requestedMode === "landing"\n      ? "landing"\n      : requestedMode === "signup"\n        ? "signup"\n        : requestedMode === "login" || location.state?.from\n          ? "login"\n          : "landing";'''
if old_login not in login:
    raise SystemExit("Login initial mode anchor not found")
login = login.replace(old_login, new_login, 1)

community_path.write_text(community, encoding="utf-8")
login_path.write_text(login, encoding="utf-8")

print("Added admin-only Public Page shortcut to the CLARA Orb.")
