"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Flame, LogIn, Mail, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setErrorText("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#081120] text-white relative">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-yellow-300/25 bg-[#0d1728]/85 p-8 shadow-[0_0_50px_rgba(250,204,21,0.12)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-300/30 bg-yellow-300/10 shadow-[0_0_25px_rgba(250,204,21,0.18)]">
              <Flame className="h-8 w-8 text-yellow-300" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-yellow-300">
              Gemeindefeuerwehr Felm
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Bitte mit deinem Benutzerkonto anmelden
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                E-Mail
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 focus-within:border-yellow-300/50">
                <Mail className="h-4 w-4 text-yellow-300" />
                <input
                  type="email"
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Passwort
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 focus-within:border-yellow-300/50">
                <LockKeyhole className="h-4 w-4 text-yellow-300" />
                <input
                  type="password"
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {errorText && (
            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorText}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 py-3 font-semibold text-[#081120] transition hover:bg-yellow-200 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Anmeldung läuft..." : "Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}
