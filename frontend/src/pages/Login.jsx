import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/mockAuth";

const benefits = [
  "Resume-driven job recommendations",
  "Faster screening with AI insights",
  "A cleaner shortlist for every application cycle",
];

export default function Login({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  {/*const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token (if backend sends it)
        localStorage.setItem("token", data.token);

        setIsAuthenticated(true);
        navigate("/jobs");
      } 
      else {
        alert(data.message || "Login failed");
      }
    } 
    catch (error) {
      console.error(error);
      alert("Server error");
    }
  };*/}

  const handleLogin = async () => {
    try {
      const data = await login({ email, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setIsAuthenticated(true);
      navigate("/jobs");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_460px] lg:px-10 lg:py-16">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
          Welcome back
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-white md:text-5xl">
          Step back into your job search with more clarity and less noise.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Pick up where you left off, revisit your fit insights, and keep your strongest
          opportunities in one focused workspace.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {benefits.map((item) => (
            <div key={item} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="mb-4 h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-300 to-orange-400" />
              <p className="text-base font-medium leading-7 text-slate-100">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-orange-300">
          Account Access
        </p>
        <h2 className="mt-4 text-3xl font-bold text-white">Login</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Use your email and password to continue to your personalized job dashboard.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
            <input
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:bg-white/[0.08]"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:bg-white/[0.08]"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <button
          onClick={handleLogin}
          className="mt-8 w-full rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
        >
          Continue to Dashboard
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-semibold text-teal-300 transition hover:text-teal-200"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </button>
        </p>

        <p className="mt-3 text-center text-sm text-slate-500">
          <button
            type="button"
            className="transition hover:text-slate-300"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </p>
      </section>
    </main>
  );
}
