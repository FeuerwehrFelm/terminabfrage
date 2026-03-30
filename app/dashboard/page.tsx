"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  name: string;
  role: string;
};

type Termin = {
  id: string;
  titel: string;
  datum: string;
  uhrzeit: string | null;
  hinweis: string | null;
};

type Rueckmeldung = {
  termin_id: string;
  profile_id: string;
  status: string;
  profiles?: {
    name: string;
  }[] | null;
};

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        alert("Profil konnte nicht geladen werden.");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: termineData, error: termineError } = await supabase
        .from("termine")
        .select("id, titel, datum, uhrzeit, hinweis")
        .order("datum", { ascending: true });

      if (termineError) {
        alert("Termine konnten nicht geladen werden: " + termineError.message);
        setLoading(false);
        return;
      }

      setTermine(termineData || []);

      const { data: rueckData, error: rueckError } = await supabase
        .from("rueckmeldungen")
        .select(`
          termin_id,
          profile_id,
          status,
          profiles (name)
        `);

      if (rueckError) {
        alert("Rückmeldungen konnten nicht geladen werden: " + rueckError.message);
        setLoading(false);
        return;
      }

      setRueckmeldungen((rueckData as Rueckmeldung[]) || []);
      setLoading(false);
    };

    loadData();
  }, []);

  const setAntwort = async (terminId: string, status: string) => {
    if (!profile) return;

    const { error } = await supabase.from("rueckmeldungen").upsert(
      {
        termin_id: terminId,
        profile_id: profile.id,
        status,
      },
      {
        onConflict: "termin_id,profile_id",
      }
    );

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    setRueckmeldungen((prev) => {
      const andere = prev.filter(
        (r) => !(r.termin_id === terminId && r.profile_id === profile.id)
      );

      return [
        ...andere,
        {
          termin_id: terminId,
          profile_id: profile.id,
          status,
          profiles: [
            {
              name: profile.name,
            },
          ],
        },
      ];
    });
  };

  const eigeneAntwort = (terminId: string) => {
    return (
      rueckmeldungen.find(
        (r) => r.termin_id === terminId && r.profile_id === profile?.id
      )?.status || "keine"
    );
  };

  const alleAntwortenZumTermin = (terminId: string) => {
    return rueckmeldungen.filter((r) => r.termin_id === terminId);
  };

  const getStats = (terminId: string) => {
    const antworten = rueckmeldungen.filter((r) => r.termin_id === terminId);

    return {
      ja: antworten.filter((a) => a.status === "ja").length,
      nein: antworten.filter((a) => a.status === "nein").length,
      unsicher: antworten.filter((a) => a.status === "unsicher").length,
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return <div className="p-10 text-white bg-black min-h-screen">Lade Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-red-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-3xl font-bold text-red-400">🔥 Terminabfrage Gemeindefeuerwehr Felm</h1>
          <button
            onClick={handleLogout}
            className="bg-zinc-800 hover:bg-zinc-700 border border-red-800 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
    
        <div className="mb-6 p-4 bg-black/40 rounded-lg border border-red-800">
          <p>Eingeloggt als: {userEmail}</p>
          <p>Name: {profile?.name}</p>
          <p>Rolle: {profile?.role}</p>
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-red-300">Termine</h2>

        {termine.length === 0 ? (
          <p>Keine Termine vorhanden.</p>
        ) : (
          <div className="space-y-6">
            {termine.map((termin) => {
              const stats = getStats(termin.id);

              return (
                <div
                  key={termin.id}
                  className="bg-black/50 border border-red-800 rounded-lg p-4 shadow-lg"
                >
                  <h3 className="text-xl font-bold text-red-400">{termin.titel}</h3>

                  <p className="text-sm text-gray-300">
                    {termin.datum} {termin.uhrzeit || ""}
                  </p>

                  {termin.hinweis && (
                    <p className="mt-2 text-gray-400">{termin.hinweis}</p>
                  )}

                  <div className="mt-3 flex gap-3 text-sm flex-wrap">
                    <span className="bg-green-800 px-2 py-1 rounded">
                      Ja: {stats.ja}
                    </span>
                    <span className="bg-red-800 px-2 py-1 rounded">
                      Nein: {stats.nein}
                    </span>
                    <span className="bg-yellow-700 text-black px-2 py-1 rounded">
                      Unsicher: {stats.unsicher}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setAntwort(termin.id, "ja")}
                      className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
                    >
                      Ja
                    </button>

                    <button
                      onClick={() => setAntwort(termin.id, "nein")}
                      className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded"
                    >
                      Nein
                    </button>

                    <button
                      onClick={() => setAntwort(termin.id, "unsicher")}
                      className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded text-black"
                    >
                      Unsicher
                    </button>
                  </div>

                  <div className="mt-4 text-sm">
                    <strong>Deine Antwort:</strong> {eigeneAntwort(termin.id)}
                  </div>

                  <div className="mt-4">
                    <strong>Alle Rückmeldungen:</strong>

                    {alleAntwortenZumTermin(termin.id).length === 0 ? (
                      <p className="text-gray-400 mt-2">Noch keine Rückmeldungen</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {alleAntwortenZumTermin(termin.id).map((r, index) => (
                          <li
                            key={`${r.termin_id}-${r.profile_id}-${index}`}
                            className="flex justify-between bg-black/30 px-3 py-2 rounded"
                          >
                            <span>{r.profiles?.[0]?.name || "Unbekannt"}</span>
                            <span className="font-semibold">{r.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}