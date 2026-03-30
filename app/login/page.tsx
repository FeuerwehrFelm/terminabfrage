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
      alert("Login erfolgreich");
      window.location.href = "/dashboard";
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Lade..." : "Login"}
      </button>
    </div>
  );
}