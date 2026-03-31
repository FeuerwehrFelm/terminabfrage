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
  profiles?: { name: string }[] | null;
};

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: termineData } = await supabase
        .from("termine")
        .select("id, titel, datum, uhrzeit, hinweis")
        .order("datum", { ascending: true });

      setTermine(termineData || []);

      const { data: rueckData } = await supabase
        .from("rueckmeldungen")
        .select(`
          termin_id,
          profile_id,
          status,
          profiles (name)
        `);

      setRueckmeldungen((rueckData as Rueckmeldung[]) || []);
      setLoading(false);
    };

    loadData();
  }, []);

  const setAntwort = async (terminId: string, status: string) => {
    if (!profile) return;

    await supabase.from("rueckmeldungen").upsert(
      {
        termin_id: terminId,
        profile_id: profile.id,
        status,
      },
      { onConflict: "termin_id,profile_id" }
    );

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
          profiles: [{ name: profile.name }],
        },
      ];
    });
  };

  const eigeneAntwort = (terminId: string) =>
    rueckmeldungen.find(
      (r) => r.termin_id === terminId && r.profile_id === profile?.id
    )?.status || "keine";

  const alleAntworten = (terminId: string) =>
    rueckmeldungen.filter((r) => r.termin_id === terminId);

  const stats = (terminId: string) => {
    const a = alleAntworten(terminId);
    return {
      ja: a.filter((x) => x.status === "ja").length,
      nein: a.filter((x) => x.status === "nein").length,
      unsicher: a.filter((x) => x.status === "unsicher").length,
    };
  };

  if (loading) return <div className="text-white p-10">Lade...</div>;

  return (
    <div className="min-h-screen bg-[#0a0f1f] text-white p-6">

      {/* Glow Hintergrund */}
      <div className="absolute w-[500px] h-[500px] bg-yellow-400/10 blur-[120px] rounded-full top-[-100px] left-[-100px]" />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-[#111827] border border-yellow-400/30 shadow-[0_0_40px_rgba(250,204,21,0.15)]">
          <h1 className="text-3xl font-bold text-yellow-400">🚒 Terminabfrage</h1>
          <p className="text-gray-400 mt-2">
            Rückmeldungen für Termine und Dienste
          </p>
        </div>

        {/* User Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-[#111827] rounded-xl border border-yellow-400/20">
            <p className="text-gray-400 text-sm">E-Mail</p>
            <p>{userEmail}</p>
          </div>

          <div className="p-4 bg-[#111827] rounded-xl border border-yellow-400/20">
            <p className="text-gray-400 text-sm">Name</p>
            <p>{profile?.name}</p>
          </div>

          <div className="p-4 bg-[#111827] rounded-xl border border-yellow-400/20">
            <p className="text-gray-400 text-sm">Rolle</p>
            <p>{profile?.role}</p>
          </div>
        </div>

        {/* Termine */}
        <div className="space-y-6">
          {termine.map((t) => {
            const s = stats(t.id);

            return (
              <div
                key={t.id}
                className="p-6 rounded-2xl bg-[#111827] border border-yellow-400/30 shadow-[0_0_30px_rgba(250,204,21,0.1)]"
              >
                <h2 className="text-xl font-bold text-yellow-400">{t.titel}</h2>

                <p className="text-gray-400 text-sm mt-1">
                  {t.datum} {t.uhrzeit}
                </p>

                {/* Stats */}
                <div className="flex gap-3 mt-3">
                  <span className="bg-green-500/20 px-2 py-1 rounded text-green-300">
                    Ja: {s.ja}
                  </span>
                  <span className="bg-red-500/20 px-2 py-1 rounded text-red-300">
                    Nein: {s.nein}
                  </span>
                  <span className="bg-yellow-400/20 px-2 py-1 rounded text-yellow-300">
                    Unsicher: {s.unsicher}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setAntwort(t.id, "ja")} className="bg-green-600 px-3 py-1 rounded">
                    Ja
                  </button>
                  <button onClick={() => setAntwort(t.id, "nein")} className="bg-red-600 px-3 py-1 rounded">
                    Nein
                  </button>
                  <button onClick={() => setAntwort(t.id, "unsicher")} className="bg-yellow-500 px-3 py-1 rounded text-black">
                    Unsicher
                  </button>
                </div>

                <p className="mt-3 text-sm">
                  Deine Antwort: {eigeneAntwort(t.id)}
                </p>

                {/* Liste */}
                <div className="mt-4">
                  {alleAntworten(t.id).map((r, i) => (
                    <div key={i} className="flex justify-between text-sm border-b border-gray-700 py-1">
                      <span>{r.profiles?.[0]?.name}</span>
                      <span>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
