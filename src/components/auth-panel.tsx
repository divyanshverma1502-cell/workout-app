"use client";

import { Dumbbell, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client-api";
import type { User } from "@/types/domain";
import { Field, GhostButton, Panel, PrimaryButton } from "@/components/ui";

export function AuthPanel({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("Athlete");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError("");
    setIsSubmitting(true);
    try {
      const response =
        mode === "signup" ? await api.signup(name, email, password) : await api.login(email, password);
      onAuthenticated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col-reverse px-4 py-6 md:px-6 lg:flex-row lg:items-center lg:gap-10">
      <section className="flex-1 py-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-lift/30 bg-lift/10 px-3 py-1 text-sm text-lift">
          <Dumbbell size={16} aria-hidden />
          Personal training log
        </div>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-white md:text-6xl">
          Track stronger weeks without clutter.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
          Log workouts fast, spot overload wins, follow bodyweight progressions, and keep long-term strength trends in one focused dark-mode app.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["SQLite", "Local secure history"],
            ["PWA", "Installable on phone"],
            ["Offline", "Queue gym logs"],
          ].map(([label, detail]) => (
            <div key={label} className="rounded-lg border border-line bg-white/[0.04] p-4">
              <p className="text-lg font-semibold text-white">{label}</p>
              <p className="mt-1 text-sm text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <Panel className="w-full flex-none lg:max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lift">Lift Log</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber/15 text-amber">
            {mode === "signup" ? <Sparkles aria-hidden /> : <LockKeyhole aria-hidden />}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-coal p-1">
          <button
            className={`min-h-10 rounded-md text-sm font-semibold transition ${mode === "signup" ? "bg-lift text-coal" : "text-slate-400"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
          <button
            className={`min-h-10 rounded-md text-sm font-semibold transition ${mode === "login" ? "bg-lift text-coal" : "text-slate-400"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
        </div>

        <div className="space-y-3">
          {mode === "signup" ? (
            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">Name</span>
              <Field value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Email</span>
            <Field value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" type="email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Password</span>
            <Field
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              type="password"
            />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

        <PrimaryButton className="mt-5 w-full" onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? "Working..." : mode === "signup" ? "Create account" : "Login"}
        </PrimaryButton>
        <GhostButton className="mt-3 w-full" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "I already have an account" : "Create a new account"}
        </GhostButton>
      </Panel>
    </main>
  );
}
