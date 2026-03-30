"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  name: string;
  role: string;
};

export default function AdminTerminePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("");
  const [hinweis, setHinweis] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        alert("Profil konnte nicht geladen werden.");
        window.location.href = "/dashboard";
        return;
      }

      if (data.role !== "admin") {
        alert("Kein Zugriff. Nur Admin darf Termine anlegen.");
        window.location.href = "/dashboard";
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleCreateTermin = async () => {
   alert(`Titel: ${titel} | Datum: ${datum}`);

if (!titel || !datum) {
  alert("Bitte Titel und Datum ausfüllen.");
  return;
}

    if (!profile) return;

    const { error } = await supabase.from("termine").insert({
      titel,
      datum,
      uhrzeit: uhrzeit || null,
      hinweis: hinweis || null,
      created_by: profile.id,
    });

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    alert("Termin erfolgreich angelegt.");

    setTitel("");
    setDatum("");
    setUhrzeit("");
    setHinweis("");
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Lade...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin: Termin anlegen</h1>

      <p>Angemeldet als: {profile?.name}</p>

      <br />

      <input
        type="text"
        placeholder="Titel"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
      />

      <br />
      <br />

      <input
        type="date"
        value={datum}
        onChange={(e) => setDatum(e.target.value)}
      />

      <br />
      <br />

      <input
        type="time"
        value={uhrzeit}
        onChange={(e) => setUhrzeit(e.target.value)}
      />

      <br />
      <br />

      <textarea
        placeholder="Hinweis"
        value={hinweis}
        onChange={(e) => setHinweis(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleCreateTermin}>Termin speichern</button>
    </div>
  );
}