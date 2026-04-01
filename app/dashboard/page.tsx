"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  CheckCircle2,
  CircleHelp,
  Flame,
  LogOut,
  User,
  Mail,
  MapPin,
  XCircle,
  Shield,
  Truck,
  Settings,
} from "lucide-react";

type Profile = {
  id: string;
  vorname?: string | null;
  name: string;
  ortswehr: string | null;
};

type Teilnehmer = {
  id: string;
  vorname: string;
  name: string;
  ortswehr: string;
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
  profile_id: string | null;
  teilnehmer_id: string | null;
  teilnehmer_vorname: string | null;
  teilnehmer_name: string | null;
  teilnehmer_ortswehr: string | null;
  status: string;
  rolle: "pa_traeger" | "maschinist" | "beide" | null;
};

type TeilnahmeSession = {
  id: string;
  vorname: string;
  name: string;
  ortswehr: string;
};

const SESSION_KEY = "teilnahme_session_v1";

export default function Dashboard() {
  const [mode, setMode] = useState<"auth" | "teilnehmer" | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teilnehmerSession, setTeilnehmerSession] = useState<Teilnehmer | null>(null);
  const [alleProfile, setAlleProfile] = useState<Profile[]>([]);
  const [alleTeilnehmer, setAlleTeilnehmer] = useState<Teilnehmer[]>([]);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [rollenProTermin, setRollenProTermin] = useState<
    Record<string, { pa_traeger: boolean; maschinist: boolean }>
  >({});
  const [loading, setLoading] = useState(true);

  const profilesById = useMemo(() => {
    return Object.fromEntries(alleProfile.map((p) => [p.id, p]));
  }, [alleProfile]);

  const teilnehmerById = useMemo(() => {
    return Object.fromEntries(alleTeilnehmer.map((t) => [t.id, t]));
  }, [alleTeilnehmer]);

  const fullName = (p?: Profile | null) =>
    p ? `${p.vorname || ""} ${p.name || ""}`.trim() || "Unbekannt" : "Unbekannt";

  const formatUhrzeit = (uhrzeit: string | null) => {
    if (!uhrzeit) return "";
    const [hh, mm] = uhrzeit.split(":");
    if (!hh || !mm) return uhrzeit;
    return `${hh}:${mm}`;
  };

  const loadSharedData = async () => {
    const [profileListe, termineData, rueckData, teilnehmerData] = await Promise.all([
      supabase.from("profiles").select("id, vorname, name, ortswehr"),
      supabase
        .from("termine")
        .select("id, titel, datum, uhrzeit, hinweis")
        .order("datum", { ascending: true }),
      supabase
        .from("rueckmeldungen")
        .select(
          "termin_id, profile_id, teilnehmer_id, teilnehmer_vorname, teilnehmer_name, teilnehmer_ortswehr, status, rolle"
        ),
      supabase.from("teilnehmer").select("id, vorname, name, ortswehr"),
    ]);

    if (profileListe.error) throw new Error(profileListe.error.message);
    if (termineData.error) throw new Error(termineData.error.message);
    if (rueckData.error) throw new Error(rueckData.error.message);

    setAlleProfile((profileListe.data as Profile[]) || []);
    setTermine((termineData.data as Termin[]) || []);
    setRueckmeldungen((rueckData.data as Rueckmeldung[]) || []);
    setAlleTeilnehmer((teilnehmerData.data as Teilnehmer[]) || []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setMode("auth");
          setUserEmail(user.email || "");

          const { data: meinProfil, error: meinProfilError } = await supabase
            .from("profiles")
            .select("id, vorname, name, ortswehr")
            .eq("id", user.id)
            .single();

          if (meinProfilError || !meinProfil) {
            throw new Error("Profil konnte nicht geladen werden.");
          }

          setProfile(meinProfil as Profile);
          await loadSharedData();
          setLoading(false);
          return;
        }

        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const session = JSON.parse(raw) as TeilnahmeSession;
          if (session?.id) {
            setMode("teilnehmer");
            setTeilnehmerSession(session);
            await loadSharedData();
            setLoading(false);
            return;
          }
        }

        window.location.href = "/teilnahme";
      } catch (e) {
        alert("Dashboard konnte nicht geladen werden.");
        console.error(e);
        setLoading(false);
      }
    };

    init();
  }, []);

  const actorKey = () => {
    if (mode === "auth" && profile) return { profileId: profile.id, teilnehmerId: null as string | null };
    if (mode === "teilnehmer" && teilnehmerSession)
      return { profileId: null as string | null, teilnehmerId: teilnehmerSession.id };
    return null;
  };

  const setAntwort = async (
    terminId: string,
    status: string,
    rolle: "pa_traeger" | "maschinist" | "beide" | null
  ) => {
    const actor = actorKey();
    if (!actor) return;

    const payload = {
      termin_id: terminId,
      profile_id: actor.profileId,
      teilnehmer_id: actor.teilnehmerId,
      teilnehmer_vorname: mode === "teilnehmer" ? teilnehmerSession?.vorname || null : null,
      teilnehmer_name: mode === "teilnehmer" ? teilnehmerSession?.name || null : null,
      teilnehmer_ortswehr: mode === "teilnehmer" ? teilnehmerSession?.ortswehr || null : null,
      status,
      rolle,
    };

    const { error } = await supabase
      .from("rueckmeldungen")
      .upsert(payload, {
        onConflict: actor.profileId ? "termin_id,profile_id" : "termin_id,teilnehmer_id",
      });

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    setRueckmeldungen((prev) => {
      const andere = prev.filter(
        (r) =>
          !(
            r.termin_id === terminId &&
            r.profile_id === actor.profileId &&
            r.teilnehmer_id === actor.teilnehmerId
          )
      );

      return [...andere, payload];
    });
  };

  const eigeneRueckmeldung = (terminId: string) => {
    const actor = actorKey();
    if (!actor) return undefined;

    return rueckmeldungen.find(
      (r) =>
        r.termin_id === terminId &&
        r.profile_id === actor.profileId &&
        r.teilnehmer_id === actor.teilnehmerId
    );
  };

  const eigeneAntwort = (terminId: string) => eigeneRueckmeldung(terminId)?.status || "keine";

  const rollenState = (terminId: string) => {
    const lokal = rollenProTermin[terminId];
    if (lokal) return lokal;

    const gespeicherteRolle = eigeneRueckmeldung(terminId)?.rolle;
    if (gespeicherteRolle === "beide") return { pa_traeger: true, maschinist: true };
    if (gespeicherteRolle === "maschinist") return { pa_traeger: false, maschinist: true };
    if (gespeicherteRolle === "pa_traeger") return { pa_traeger: true, maschinist: false };

    return { pa_traeger: false, maschinist: false };
  };

  const rollenWert = (terminId: string) => {
    const state = rollenState(terminId);
    if (state.pa_traeger && state.maschinist) return "beide" as const;
    if (state.pa_traeger) return "pa_traeger" as const;
    if (state.maschinist) return "maschinist" as const;
    return null;
  };

  const toggleRolle = async (terminId: string, key: "pa_traeger" | "maschinist") => {
    const current = rollenState(terminId);
    const next = {
      ...current,
      [key]: !current[key],
    };

    setRollenProTermin((prev) => ({
      ...prev,
      [terminId]: next,
    }));

    const meine = eigeneRueckmeldung(terminId);
    if (!meine) return;

    const nextRolle =
      next.pa_traeger && next.maschinist
        ? ("beide" as const)
        : next.pa_traeger
        ? ("pa_traeger" as const)
        : next.maschinist
        ? ("maschinist" as const)
        : null;

    await setAntwort(terminId, meine.status, nextRolle);
  };

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

  const handleTeilnehmerLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "/teilnahme";
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
                  Gemeindefeuerwehr Felm
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Rückmeldungen zu Terminen</h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                Alle Antworten sind transparent sichtbar. Du kannst pro Termin mit Ja, Nein oder
                Unsicher reagieren.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {mode === "auth" ? (
                <>
                  <button
                    onClick={() => (window.location.href = "/profil")}
                    className="flex items-center gap-2 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 font-medium text-white transition hover:border-yellow-300/40 hover:bg-[#16243b]"
                  >
                    <Settings className="h-4 w-4 text-yellow-300" />
                    Profil
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 font-medium text-white transition hover:border-yellow-300/40 hover:bg-[#16243b]"
                  >
                    <LogOut className="h-4 w-4 text-yellow-300" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleTeilnehmerLogout}
                  className="flex items-center gap-2 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 font-medium text-white transition hover:border-yellow-300/40 hover:bg-[#16243b]"
                >
                  <LogOut className="h-4 w-4 text-yellow-300" />
                  Person wechseln
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={<Mail className="h-4 w-4 text-yellow-300" />}
            label={mode === "auth" ? "E-Mail" : "Modus"}
            value={mode === "auth" ? userEmail : "Teilnahme ohne Login"}
          />
          <InfoCard
            icon={<User className="h-4 w-4 text-yellow-300" />}
            label="Name"
            value={
              mode === "auth"
                ? fullName(profile)
                : teilnehmerSession
                ? `${teilnehmerSession.vorname} ${teilnehmerSession.name}`
                : "-"
            }
          />
          <InfoCard
            icon={<MapPin className="h-4 w-4 text-yellow-300" />}
            label="Ortswehr"
            value={
              mode === "auth"
                ? profile?.ortswehr || "-"
                : teilnehmerSession?.ortswehr || "-"
            }
          />
        </div>

        <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-[#0d1728]/85 p-5">
          <div className="text-sm text-slate-300">Rolle wird pro Termin ausgewählt.</div>
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
              const eigeneStatus = eigeneRueckmeldung(t.id)?.status;

              return (
                <div
                  key={t.id}
                  className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/85 p-6 shadow-[0_0_30px_rgba(250,204,21,0.07)]"
                >
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-yellow-300">{t.titel}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {t.datum} {formatUhrzeit(t.uhrzeit)}
                      </p>
                      {t.hinweis && <p className="mt-3 text-slate-300">{t.hinweis}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge tone="green">Ja: {s.ja}</Badge>
                      <Badge tone="red">Nein: {s.nein}</Badge>
                      <Badge tone="yellow">Unsicher: {s.unsicher}</Badge>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => toggleRolle(t.id, "pa_traeger")}
                      className={`rounded-2xl border px-4 py-2 font-medium transition ${
                        rollenState(t.id).pa_traeger
                          ? "border-yellow-300/25 bg-yellow-300/10 text-yellow-300"
                          : "border-slate-500/30 bg-slate-700/10 text-slate-300 hover:border-yellow-300/25"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        PA-Träger
                      </span>
                    </button>
                    <button
                      onClick={() => toggleRolle(t.id, "maschinist")}
                      className={`rounded-2xl border px-4 py-2 font-medium transition ${
                        rollenState(t.id).maschinist
                          ? "border-yellow-300/25 bg-yellow-300/10 text-yellow-300"
                          : "border-slate-500/30 bg-slate-700/10 text-slate-300 hover:border-yellow-300/25"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Maschinist
                      </span>
                    </button>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const rolle = rollenWert(t.id);
                        setAntwort(t.id, "ja", rolle);
                      }}
                      className={`rounded-2xl border px-4 py-2 font-medium transition ${
                        eigeneStatus === "ja"
                          ? "border-green-300 bg-green-500/35 text-white shadow-[0_0_20px_rgba(34,197,94,0.35)]"
                          : "border-green-400/25 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                      }`}
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => {
                        const rolle = rollenWert(t.id);
                        setAntwort(t.id, "nein", rolle);
                      }}
                      className={`rounded-2xl border px-4 py-2 font-medium transition ${
                        eigeneStatus === "nein"
                          ? "border-red-300 bg-red-500/35 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                          : "border-red-400/25 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      }`}
                    >
                      Nein
                    </button>
                    <button
                      onClick={() => {
                        const rolle = rollenWert(t.id);
                        setAntwort(t.id, "unsicher", rolle);
                      }}
                      className={`rounded-2xl border px-4 py-2 font-medium transition ${
                        eigeneStatus === "unsicher"
                          ? "border-yellow-200 bg-yellow-300/35 text-white shadow-[0_0_20px_rgba(250,204,21,0.35)]"
                          : "border-yellow-300/25 bg-yellow-300/10 text-yellow-300 hover:bg-yellow-300/20"
                      }`}
                    >
                      Unsicher
                    </button>
                  </div>

                  <div className="mb-5 rounded-2xl border border-yellow-300/15 bg-[#111c2f] p-4">
                    <div className="text-sm text-slate-400">Deine Antwort</div>
                    <div className="mt-1 text-lg font-semibold text-white">{eigeneAntwort(t.id)}</div>
                    <div className="mt-2 text-sm text-slate-300">
                      Rolle:{" "}
                      {eigeneRueckmeldung(t.id)?.rolle === "beide"
                        ? "PA-Träger + Maschinist"
                        : eigeneRueckmeldung(t.id)?.rolle === "maschinist"
                        ? "Maschinist"
                        : eigeneRueckmeldung(t.id)?.rolle === "pa_traeger"
                        ? "PA-Träger"
                        : "-"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-lg font-semibold text-yellow-300">Alle Rückmeldungen</div>

                    {alleAntworten(t.id).length === 0 ? (
                      <div className="rounded-2xl border border-yellow-300/10 bg-[#111c2f] p-4 text-slate-400">
                        Noch keine Rückmeldungen
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alleAntworten(t.id).map((r, i) => {
                          const person = r.profile_id ? profilesById[r.profile_id] : null;
                          const teilnehmer = r.teilnehmer_id ? teilnehmerById[r.teilnehmer_id] : null;

                          return (
                            <div
                              key={i}
                              className="rounded-2xl border border-yellow-300/10 bg-[#111c2f] px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium text-white">
                                    {teilnehmer
                                      ? `${teilnehmer.vorname} ${teilnehmer.name}`
                                      : r.teilnehmer_vorname || r.teilnehmer_name
                                      ? `${r.teilnehmer_vorname || ""} ${r.teilnehmer_name || ""}`.trim()
                                      : fullName(person)}{" "}
                                    <span className="text-sm text-slate-400">
                                      ({teilnehmer?.ortswehr ||
                                        r.teilnehmer_ortswehr ||
                                        person?.ortswehr ||
                                        "-"})
                                    </span>
                                  </div>
                                </div>

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

                              {r.rolle && (
                                <div className="mt-3">
                                  <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2 py-1 text-xs font-medium text-yellow-300">
                                    {r.rolle === "beide"
                                      ? "PA-Träger + Maschinist"
                                      : r.rolle === "maschinist"
                                      ? "Maschinist"
                                      : "PA-Träger"}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
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

  return <span className={`rounded-full border px-3 py-1 text-sm font-medium ${styles}`}>{children}</span>;
}
