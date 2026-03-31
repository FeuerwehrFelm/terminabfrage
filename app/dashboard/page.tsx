"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  CheckCircle2,
  CircleHelp,
  Flame,
  LogOut,
  User,
  Mail,
  Shield,
  XCircle,
} from "lucide-react";

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
      { onConflict: "termin_id,profile_id" }
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

  const gesamt = {
    ja: rueckmeldungen.filter((r) => r.status === "ja").length,
    nein: rueckmeldungen.filter((r) => r.status === "nein").length,
    unsicher: rueckmeldungen.filter((r) => r.status === "unsicher").length,
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081120] text-white flex items-center justify-center">
        Lade Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081120] text-white relative overflow-hidden p-6">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-yellow-300/25 bg-gradient-to-r from-[#0f1d34] to-[#132544] p-6 shadow-[0_0_40px_rgba(250,204,21,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-yellow-300">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-semibold tracking-[0.2em] uppercase">
                  Terminabfrage
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Rückmeldungen zu Terminen
              </h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                Alle Antworten sind transparent sichtbar. Du kannst pro Termin mit
                Ja, Nein oder Unsicher reagieren.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 font-medium text-white transition hover:border-yellow-300/40 hover:bg-[#16243b]"
            >
              <LogOut className="h-4 w-4 text-yellow-300" />
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <InfoCard icon={<Mail className="h-4 w-4 text-yellow-300" />} label="E-Mail" value={userEmail} />
          <InfoCard icon={<User className="h-4 w-4 text-yellow-300" />} label="Name" value={profile?.name || "-"} />
          <InfoCard icon={<Shield className="h-4 w-4 text-yellow-300" />} label="Rolle" value={profile?.role || "-"} />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Zusagen gesamt"
            value={gesamt.ja}
            icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
          />
          <StatCard
            label="Absagen gesamt"
            value={gesamt.nein}
            icon={<XCircle className="h-5 w-5 text-red-400" />}
          />
          <StatCard
            label="Unsicher gesamt"
            value={gesamt.unsicher}
            icon={<CircleHelp className="h-5 w-5 text-yellow-300" />}
          />
        </div>

        <div className="space-y-6">
          {termine.length === 0 ? (
            <div className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/80 p-8 text-center text-slate-400">
              Noch keine Termine vorhanden.
            </div>
          ) : (
            termine.map((t) => {
              const s = stats(t.id);

              return (
                <div
                  key={t.id}
                  className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/85 p-6 shadow-[0_0_30px_rgba(250,204,21,0.07)]"
                >
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-yellow-300">{t.titel}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {t.datum} {t.uhrzeit || ""}
                      </p>
                      {t.hinweis && (
                        <p className="mt-3 text-slate-300">{t.hinweis}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge tone="green">Ja: {s.ja}</Badge>
                      <Badge tone="red">Nein: {s.nein}</Badge>
                      <Badge tone="yellow">Unsicher: {s.unsicher}</Badge>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => setAntwort(t.id, "ja")}
                      className="rounded-2xl border border-green-400/25 bg-green-500/10 px-4 py-2 font-medium text-green-300 transition hover:bg-green-500/20"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setAntwort(t.id, "nein")}
                      className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-2 font-medium text-red-300 transition hover:bg-red-500/20"
                    >
                      Nein
                    </button>
                    <button
                      onClick={() => setAntwort(t.id, "unsicher")}
                      className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 font-medium text-yellow-300 transition hover:bg-yellow-300/20"
                    >
                      Unsicher
                    </button>
                  </div>

                  <div className="mb-5 rounded-2xl border border-yellow-300/15 bg-[#111c2f] p-4">
                    <div className="text-sm text-slate-400">Deine Antwort</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {eigeneAntwort(t.id)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-lg font-semibold text-yellow-300">
                      Alle Rückmeldungen
                    </div>

                    {alleAntworten(t.id).length === 0 ? (
                      <div className="rounded-2xl border border-yellow-300/10 bg-[#111c2f] p-4 text-slate-400">
                        Noch keine Rückmeldungen
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alleAntworten(t.id).map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-2xl border border-yellow-300/10 bg-[#111c2f] px-4 py-3"
                          >
                            <span className="font-medium text-white">
                              {r.profiles?.[0]?.name || "Unbekannt"}
                            </span>
                            <Badge
                              tone={
                                r.status === "ja"
                                  ? "green"
                                  : r.status === "nein"
                                  ? "red"
                                  : "yellow"
                              }
                            >
                              {r.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-yellow-300/20 bg-[#0d1728]/85 p-5">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-yellow-300/20 bg-[#0d1728]/85 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-4xl font-bold text-white">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "red" | "yellow";
}) {
  const styles =
    tone === "green"
      ? "border-green-400/25 bg-green-500/10 text-green-300"
      : tone === "red"
      ? "border-red-400/25 bg-red-500/10 text-red-300"
      : "border-yellow-300/25 bg-yellow-300/10 text-yellow-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-medium ${styles}`}>
      {children}
    </span>
  );
}