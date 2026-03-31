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
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="rounded-2xl border border-red-500/30 bg-zinc-900/70 px-6 py-4 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
          Lade Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute top-[-120px] left-[-120px] h-[320px] w-[320px] rounded-full bg-red-700/20 blur-[110px]" />
      <div className="absolute bottom-[-140px] right-[-120px] h-[320px] w-[320px] rounded-full bg-orange-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl p-6 md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="rounded-3xl border border-red-500/30 bg-zinc-900/70 px-6 py-5 shadow-[0_0_40px_rgba(255,0,0,0.18)] backdrop-blur-xl">
            <div className="mb-2 text-5xl drop-shadow-[0_0_10px_rgba(255,80,0,0.8)]">
              🔥
            </div>
            <h1 className="text-3xl font-bold tracking-wide text-red-400">
              Terminabfrage
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Rückmeldungen zu euren Terminen im Überblick
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-red-500/40 bg-zinc-900/70 px-5 py-3 font-medium text-white shadow-[0_0_20px_rgba(255,0,0,0.12)] transition hover:border-red-400 hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-red-500/30 bg-zinc-900/70 p-5 shadow-[0_0_30px_rgba(255,0,0,0.14)] backdrop-blur-xl">
            <div className="text-sm text-zinc-400">E-Mail</div>
            <div className="mt-1 font-semibold text-white">{userEmail}</div>
          </div>
          <div className="rounded-2xl border border-orange-500/30 bg-zinc-900/70 p-5 shadow-[0_0_30px_rgba(255,120,0,0.12)] backdrop-blur-xl">
            <div className="text-sm text-zinc-400">Name</div>
            <div className="mt-1 font-semibold text-white">{profile?.name}</div>
          </div>
          <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900/70 p-5 shadow-[0_0_30px_rgba(255,180,0,0.1)] backdrop-blur-xl">
            <div className="text-sm text-zinc-400">Rolle</div>
            <div className="mt-1 font-semibold text-white">{profile?.role}</div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-red-300">Termine</h2>
        </div>

        {termine.length === 0 ? (
          <div className="rounded-3xl border border-red-500/25 bg-zinc-900/60 p-8 text-zinc-400 shadow-[0_0_30px_rgba(255,0,0,0.1)] backdrop-blur-xl">
            Keine Termine vorhanden.
          </div>
        ) : (
          <div className="space-y-6">
            {termine.map((termin) => {
              const stats = getStats(termin.id);

              return (
                <div
                  key={termin.id}
                  className="rounded-3xl border border-red-500/30 bg-zinc-900/70 p-6 shadow-[0_0_40px_rgba(255,0,0,0.14)] backdrop-blur-xl"
                >
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-red-400">
                        {termin.titel}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-400">
                        {termin.datum} {termin.uhrzeit || ""}
                      </p>
                      {termin.hinweis && (
                        <p className="mt-3 text-zinc-300">{termin.hinweis}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300">
                        Ja: {stats.ja}
                      </span>
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-300">
                        Nein: {stats.nein}
                      </span>
                      <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
                        Unsicher: {stats.unsicher}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => setAntwort(termin.id, "ja")}
                      className="rounded-xl border border-green-500/40 bg-green-500/15 px-4 py-2 font-medium text-green-200 transition hover:bg-green-500/25"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setAntwort(termin.id, "nein")}
                      className="rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2 font-medium text-red-200 transition hover:bg-red-500/25"
                    >
                      Nein
                    </button>
                    <button
                      onClick={() => setAntwort(termin.id, "unsicher")}
                      className="rounded-xl border border-yellow-500/40 bg-yellow-500/15 px-4 py-2 font-medium text-yellow-200 transition hover:bg-yellow-500/25"
                    >
                      Unsicher
                    </button>
                  </div>

                  <div className="mb-5 rounded-2xl border border-orange-500/20 bg-black/25 p-4">
                    <span className="text-sm text-zinc-400">Deine Antwort</span>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {eigeneAntwort(termin.id)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-lg font-semibold text-orange-300">
                      Alle Rückmeldungen
                    </div>

                    {alleAntwortenZumTermin(termin.id).length === 0 ? (
                      <div className="rounded-2xl border border-red-500/20 bg-black/20 p-4 text-zinc-400">
                        Noch keine Rückmeldungen
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alleAntwortenZumTermin(termin.id).map((r, index) => (
                          <div
                            key={`${r.termin_id}-${r.profile_id}-${index}`}
                            className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-black/25 px-4 py-3"
                          >
                            <span className="font-medium text-white">
                              {r.profiles?.[0]?.name || "Unbekannt"}
                            </span>
                            <span
                              className={[
                                "rounded-full px-3 py-1 text-sm font-semibold border",
                                r.status === "ja"
                                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                                  : r.status === "nein"
                                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
                              ].join(" ")}
                            >
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
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