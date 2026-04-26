import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../api/auth";

const onboardingNotes = [
  "Build your candidate profile once and reuse it across applications.",
  "Get clearer signals on which roles align with your strengths.",
  "Move from generic job browsing to smarter, resume-aware matching.",
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  {/*const handleSignup = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Signup successful");
        navigate("/login");
      } 
      else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  };*/}
  const handleSignup = async () => {
    try {
      const res = await signup({ ...form, role: "candidate" });
      alert(res.message || "Signup successful");
      navigate("/login");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-16">
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-orange-300">
          Create Account
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">Start with a sharper profile.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Create your JobAI account to unlock tailored screening and smarter job discovery.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Full name</span>
            <input
              placeholder="Your name"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:bg-white/[0.08]"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
            <input
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:bg-white/[0.08]"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
            <input
              type="password"
              placeholder="Create a password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:bg-white/[0.08]"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
        </div>

        <button
          onClick={handleSignup}
          className="mt-8 w-full rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
        >
          Create Account
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <button
            type="button"
            className="font-semibold text-teal-300 transition hover:text-teal-200"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
          Why JobAI
        </p>
        <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-white">
          Organize your search around fit, not guesswork.
        </h2>
        <div className="mt-8 space-y-4">
          {onboardingNotes.map((note, index) => (
            <div
              key={note}
              className="flex items-start gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                0{index + 1}
              </span>
              <p className="pt-2 text-base leading-7 text-slate-200">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
