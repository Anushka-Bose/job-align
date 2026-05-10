import { Link, NavLink } from "react-router-dom";
import { BiLogoBaidu } from "react-icons/bi";
import { useEffect, useState } from "react";
import { getNotifications, markNotificationRead } from "../api/notifications";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Jobs" },
];

export default function Navbar({ isAuthenticated, setIsAuthenticated }) {
  const [notificationFeed, setNotificationFeed] = useState({ unreadCount: 0, notifications: [] });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const roleAwareItems = user?.role === "recruiter"
    ? [
        { to: "/", label: "Home" },
        { to: "/recruiter-jobs", label: "Jobs" },
        { to: "/recruiter-dashboard", label: "Leaderboard" },
      ]
    : [...navItems, { to: "/upload", label: "Upload" }];
  const token = localStorage.getItem("token");
  const canSeeNotifications = isAuthenticated && user?.role === "candidate";

  useEffect(() => {
    if (!canSeeNotifications || !token) {
      setNotificationFeed({ unreadCount: 0, notifications: [] });
      return;
    }

    let ignore = false;

    const loadNotifications = async () => {
      try {
        const data = await getNotifications({ token });
        if (!ignore) {
          setNotificationFeed(data);
        }
      } catch {
        if (!ignore) {
          setNotificationFeed({ unreadCount: 0, notifications: [] });
        }
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [canSeeNotifications, token]);

  const handleNotificationClick = async (notification) => {
    if (!notification?.isRead && token) {
      try {
        await markNotificationRead({
          token,
          notificationId: notification._id,
        });
        setNotificationFeed((current) => ({
          unreadCount: Math.max(0, (current.unreadCount || 0) - 1),
          notifications: current.notifications.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item
          ),
        }));
      } catch {
        // Keep the UI usable even if marking read fails.
      }
    }

    if (notification?.redirectUrl) {
      window.open(notification.redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

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
            {roleAwareItems.map((item) => (
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

          {canSeeNotifications ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen((value) => !value)}
                className="relative rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Notifications
                {notificationFeed.unreadCount > 0 ? (
                  <span className="ml-2 rounded-full bg-orange-300 px-2 py-0.5 text-xs font-bold text-slate-950">
                    {notificationFeed.unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationOpen ? (
                <div className="absolute right-0 mt-3 w-[340px] rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Resume Alerts
                  </p>
                  <div className="mt-3 grid gap-3">
                    {notificationFeed.notifications.length ? (
                      notificationFeed.notifications.slice(0, 6).map((notification) => (
                        <button
                          key={notification._id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`rounded-2xl border p-4 text-left transition hover:border-teal-300/30 hover:bg-white/[0.05] ${
                            notification.isRead
                              ? "border-white/10 bg-white/[0.03]"
                              : "border-orange-300/20 bg-orange-400/10"
                          }`}
                        >
                          <p className="text-sm font-semibold text-white">{notification.title}</p>
                          <p className="mt-1 text-sm text-slate-300">{notification.company}</p>
                          <p className="mt-2 text-sm text-slate-400">{notification.message}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-teal-200">
                            Match {notification.matchScore ?? 0}%
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                        No notifications yet. New jobs that match your uploaded resume will appear here.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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
