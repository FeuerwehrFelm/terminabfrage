"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Fehler: " + error.message);
    } else {
      window.location.href = "/dashboard";
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">

      {/* Hintergrund Glow */}
      <div className="absolute w-[500px] h-[500px] bg-red-700/20 blur-[120px] rounded-full"></div>

      <div className="z-10 w-full max-w-md p-8 rounded-2xl border border-red-500/40 bg-zinc-900/70 backdrop-blur-xl shadow-[0_0_40px_rgba(255,0,0,0.3)]">

        {/* Flamme */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 drop-shadow-[0_0_10px_rgba(255,80,0,0.8)]">
            🔥
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-red-400">
            Terminabfrage
          </h1>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/60 border border-red-500/40 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition"
          />

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/60 border border-red-500/40 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 p-3 rounded-lg bg-red-600 hover:bg-red-500 transition font-semibold shadow-lg shadow-red-900/50"
        >
          {loading ? "Lade..." : "Login"}
        </button>

      </div>
    </div>
  );
}