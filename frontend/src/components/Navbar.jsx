import { Link, NavLink } from "react-router-dom";
import { BiLogoBaidu } from "react-icons/bi";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Jobs" },
  { to: "/upload", label: "Upload" },
];

export default function Navbar({ isAuthenticated, setIsAuthenticated }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-300 to-orange-400 text-base font-black text-slate-950 shadow-lg shadow-teal-500/20">
            <BiLogoBaidu />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-200">
              Career Intelligence
            </p>
            <h1 className="text-xl font-black tracking-tight">Smart Align AI</h1>
          </div>
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                localStorage.removeItem("auth");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setIsAuthenticated(false);
              }}
              className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
