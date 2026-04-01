"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Flame,
  LogIn,
  MapPin,
  Shield,
  Truck,
  User,
} from "lucide-react";

type Profil = {
  id: string;
  vorname: string | null;
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
const ORTSWEHREN = ["Felm", "Rathmannsdorf-Felmerholz"] as const;

export default function TeilnahmePage() {
  const [loading, setLoading] = useState(true);
  const [eintrittLaden, setEintrittLaden] = useState(false);
  const [speichern, setSpeichern] = useState(false);
  const [fehler, setFehler] = useState("");

  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer | null>(null);
  const [vorname, setVorname] = useState("");
  const [name, setName] = useState("");
  const [ortswehr, setOrtswehr] = useState("");
  const [code, setCode] = useState("");

  const [termine, setTermine] = useState<Termin[]>([]);
  const [rueckmeldungen, setRueckmeldungen] = useState<Rueckmeldung[]>([]);
  const [profile, setProfile] = useState<Profil[]>([]);
  const [alleTeilnehmer, setAlleTeilnehmer] = useState<Teilnehmer[]>([]);
  const [rollenProTermin, setRollenProTermin] = useState<
    Record<string, { pa_traeger: boolean; maschinist: boolean }>
  >({});

  const profilesById = useMemo(() => {
    return Object.fromEntries(profile.map((p) => [p.id, p]));
  }, [profile]);

  const teilnehmerById = useMemo(() => {
    return Object.fromEntries(alleTeilnehmer.map((t) => [t.id, t]));
  }, [alleTeilnehmer]);

  const ortswehrText = (v: string | null | undefined) => (v && v.trim() ? v : "-");

  const nameAusProfil = (p?: Profil | null) =>
    p ? `${p.vorname || ""} ${p.name || ""}`.trim() || "Unbekannt" : "Unbekannt";

  const nameAusTeilnehmer = (t?: Teilnehmer | null) =>
    t ? `${t.vorname || ""} ${t.name || ""}`.trim() || "Unbekannt" : "Unbekannt";

  const formatTerminDatum = (datum: string) => {
    const [y, m, d] = datum.split("-").map(Number);
    if (!y || !m || !d) return datum;
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatTerminUhrzeit = (uhrzeit: string | null) => {
    if (!uhrzeit) return "Uhrzeit folgt";
    const [hh, mm] = uhrzeit.split(":");
    if (!hh || !mm) return `${uhrzeit} Uhr`;
    return `${hh}:${mm} Uhr`;
  };

  const ladeDaten = async () => {
    const [termineRes, rueckRes, profileRes, teilnehmerRes] = await Promise.all([
      supabase
        .from("termine")
        .select("id, titel, datum, uhrzeit, hinweis")
        .order("datum", { ascending: true }),
      supabase
        .from("rueckmeldungen")
        .select(
          "termin_id, profile_id, teilnehmer_id, teilnehmer_vorname, teilnehmer_name, teilnehmer_ortswehr, status, rolle"
        ),
      supabase.from("profiles").select("id, vorname, name, ortswehr"),
      supabase.from("teilnehmer").select("id, vorname, name, ortswehr"),
    ]);

    if (termineRes.error) {
      setFehler("Termine konnten nicht geladen werden: " + termineRes.error.message);
      return;
    }

    if (rueckRes.error) {
      setFehler("Rückmeldungen konnten nicht geladen werden: " + rueckRes.error.message);
      return;
    }

    if (!profileRes.error) setProfile((profileRes.data as Profil[]) || []);
    if (!teilnehmerRes.error) setAlleTeilnehmer((teilnehmerRes.data as Teilnehmer[]) || []);

    setTermine((termineRes.data as Termin[]) || []);
    setRueckmeldungen((rueckRes.data as Rueckmeldung[]) || []);
  };

  useEffect(() => {
    const init = async () => {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as TeilnahmeSession;
          if (parsed.id && parsed.name && parsed.vorname && parsed.ortswehr) {
            setTeilnehmer(parsed);
            setVorname(parsed.vorname);
            setName(parsed.name);
            setOrtswehr(parsed.ortswehr);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }

      await ladeDaten();
      setLoading(false);
    };

    init();
  }, []);

  const teilnehmerRueckmeldung = (terminId: string) =>
    rueckmeldungen.find(
      (r) => r.termin_id === terminId && r.teilnehmer_id === teilnehmer?.id
    );

  const rollenState = (terminId: string) => {
    const lokal = rollenProTermin[terminId];
    if (lokal) return lokal;

    const gespeichert = teilnehmerRueckmeldung(terminId)?.rolle;
    if (gespeichert === "beide") return { pa_traeger: true, maschinist: true };
    if (gespeichert === "maschinist") return { pa_traeger: false, maschinist: true };
    if (gespeichert === "pa_traeger") return { pa_traeger: true, maschinist: false };
    return { pa_traeger: false, maschinist: false };
  };

  const rollenWert = (terminId: string) => {
    const s = rollenState(terminId);
    if (s.pa_traeger && s.maschinist) return "beide" as const;
    if (s.pa_traeger) return "pa_traeger" as const;
    if (s.maschinist) return "maschinist" as const;
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

    const meine = teilnehmerRueckmeldung(terminId);
    if (!meine || !teilnehmer) return;

    const nextRolle =
      next.pa_traeger && next.maschinist
        ? ("beide" as const)
        : next.pa_traeger
        ? ("pa_traeger" as const)
        : next.maschinist
        ? ("maschinist" as const)
        : null;

    const { error } = await supabase.from("rueckmeldungen").upsert(
      {
        termin_id: terminId,
        profile_id: null,
        teilnehmer_id: teilnehmer.id,
        teilnehmer_vorname: teilnehmer.vorname,
        teilnehmer_name: teilnehmer.name,
        teilnehmer_ortswehr: teilnehmer.ortswehr,
        status: meine.status,
        rolle: nextRolle,
      },
      { onConflict: "termin_id,teilnehmer_id" }
    );

    if (error) {
      setFehler("Fehler beim Speichern: " + error.message);
      return;
    }

    setRueckmeldungen((prev) => {
      const ohneMich = prev.filter(
        (r) => !(r.termin_id === terminId && r.teilnehmer_id === teilnehmer.id)
      );

      return [
        ...ohneMich,
        {
          termin_id: terminId,
          teilnehmer_id: teilnehmer.id,
          profile_id: null,
          teilnehmer_vorname: teilnehmer.vorname,
          teilnehmer_name: teilnehmer.name,
          teilnehmer_ortswehr: teilnehmer.ortswehr,
          status: meine.status,
          rolle: nextRolle,
        },
      ];
    });
  };

  const setAntwort = async (terminId: string, status: string) => {
    if (!teilnehmer) return;

    const rolle = rollenWert(terminId);
    setFehler("");
    setSpeichern(true);

    const { error } = await supabase.from("rueckmeldungen").upsert(
      {
        termin_id: terminId,
        profile_id: null,
        teilnehmer_id: teilnehmer.id,
        teilnehmer_vorname: teilnehmer.vorname,
        teilnehmer_name: teilnehmer.name,
        teilnehmer_ortswehr: teilnehmer.ortswehr,
        status,
        rolle,
      },
      { onConflict: "termin_id,teilnehmer_id" }
    );

    setSpeichern(false);

    if (error) {
      setFehler("Fehler beim Speichern: " + error.message);
      return;
    }

    setRueckmeldungen((prev) => {
      const ohneMich = prev.filter(
        (r) => !(r.termin_id === terminId && r.teilnehmer_id === teilnehmer.id)
      );

      return [
        ...ohneMich,
        {
          termin_id: terminId,
          teilnehmer_id: teilnehmer.id,
          profile_id: null,
          teilnehmer_vorname: teilnehmer.vorname,
          teilnehmer_name: teilnehmer.name,
          teilnehmer_ortswehr: teilnehmer.ortswehr,
          status,
          rolle,
        },
      ];
    });
  };

  const handleTeilnahmeStart = async () => {
    const v = vorname.trim();
    const n = name.trim();
    const o = ortswehr.trim();
    const c = code.trim();

    if (!v || !n || !o || !c) {
      setFehler("Bitte alle Felder inklusive Code ausfüllen.");
      return;
    }

    setFehler("");
    setEintrittLaden(true);

    const verifyRes = await fetch("/api/teilnahme/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c }),
    });

    const verifyBody = (await verifyRes.json()) as { ok: boolean; error?: string };
    if (!verifyRes.ok || !verifyBody.ok) {
      setEintrittLaden(false);
      setFehler(verifyBody.error || "Code ist ungültig.");
      return;
    }

    const findExistingTeilnehmer = async () => {
      const { data } = await supabase
        .from("teilnehmer")
        .select("id, vorname, name, ortswehr")
        .ilike("vorname", v)
        .ilike("name", n)
        .ilike("ortswehr", o)
        .maybeSingle();

      return (data as Teilnehmer | null) || null;
    };

    const existing = await findExistingTeilnehmer();

    let person = existing as Teilnehmer | null;

    if (!person) {
      const { data: created, error: createError } = await supabase
        .from("teilnehmer")
        .insert({
          vorname: v,
          name: n,
          ortswehr: o,
        })
        .select("id, vorname, name, ortswehr")
        .single();

      if (createError) {
        if ((createError as { code?: string }).code === "23505") {
          person = await findExistingTeilnehmer();
        } else {
          setEintrittLaden(false);
          setFehler("Teilnahme konnte nicht gestartet werden: " + createError.message);
          return;
        }
      }

      if (!person && !created) {
        setEintrittLaden(false);
        setFehler("Teilnahme konnte nicht gestartet werden.");
        return;
      }

      if (!person) {
        person = created as Teilnehmer;
        setAlleTeilnehmer((prev) => [...prev, person as Teilnehmer]);
      }
    }

    if (!person) {
      setEintrittLaden(false);
      setFehler("Teilnahme konnte nicht gestartet werden.");
      return;
    }

    const session: TeilnahmeSession = {
      id: person.id,
      vorname: person.vorname,
      name: person.name,
      ortswehr: person.ortswehr,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setTeilnehmer(person);
    setCode("");
    setEintrittLaden(false);
    window.location.href = "/dashboard";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081120] text-white flex items-center justify-center p-6">
        Lade Teilnahme...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081120] text-white relative overflow-hidden p-4 md:p-6">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-5">
        <div className="rounded-3xl border border-yellow-300/25 bg-gradient-to-r from-[#0f1d34] to-[#132544] p-5 md:p-6">
          <div className="mb-2 flex items-center gap-2 text-yellow-300">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">
              Gemeindefeuerwehr Felm
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Terminübersicht</h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            Bitte gib an, ob du kommst und welche Funktion du übernehmen kannst.
          </p>
        </div>

        {!teilnehmer ? (
          <div className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/90 p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Vorname" icon={<User className="h-4 w-4 text-yellow-300" />}>
                <input
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                  placeholder="Vorname"
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </Field>

              <Field label="Nachname" icon={<User className="h-4 w-4 text-yellow-300" />}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nachname"
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </Field>

              <Field label="Ortswehr" icon={<MapPin className="h-4 w-4 text-yellow-300" />}>
                <select
                  value={ortswehr}
                  onChange={(e) => setOrtswehr(e.target.value)}
                  className="w-full bg-transparent text-white outline-none"
                >
                  <option value="" className="bg-[#111c2f] text-slate-400">
                    Bitte wählen...
                  </option>
                  {ORTSWEHREN.map((option) => (
                    <option key={option} value={option} className="bg-[#111c2f] text-white">
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Teilnahme-Code" icon={<LogIn className="h-4 w-4 text-yellow-300" />}>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code"
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </Field>
            </div>

            {fehler && (
              <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {fehler}
              </div>
            )}

            <button
              onClick={handleTeilnahmeStart}
              disabled={eintrittLaden}
              className="mt-5 w-full rounded-2xl bg-yellow-300 px-4 py-3 font-semibold text-[#081120] transition hover:bg-yellow-200 disabled:opacity-60"
            >
              {eintrittLaden ? "Prüfe..." : "Teilnahme starten"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-yellow-300/20 bg-[#0d1728]/90 p-4 md:p-5">
              <div>
                <div className="text-sm text-slate-400">Angemeldet als</div>
                <div className="font-semibold text-white">
                  {nameAusTeilnehmer(teilnehmer)} ({ortswehrText(teilnehmer.ortswehr)})
                </div>
              </div>
            </div>

            {fehler && (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {fehler}
              </div>
            )}

            <div className="space-y-4">
              {termine.length === 0 ? (
                <div className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/80 p-6 text-center text-slate-400">
                  Noch keine Termine vorhanden.
                </div>
              ) : (
                termine.map((t) => {
                  const s = stats(t.id);
                  const meine = teilnehmerRueckmeldung(t.id);

                  return (
                    <div
                      key={t.id}
                      className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/90 p-4 md:p-6"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-yellow-300">
                            {t.titel}
                          </h2>
                          <div className="mt-2">
                            <div className="text-base md:text-lg font-semibold text-slate-200">
                              {formatTerminDatum(t.datum)}
                            </div>
                            <div className="text-sm md:text-base text-slate-300">
                              {formatTerminUhrzeit(t.uhrzeit)}
                            </div>
                          </div>
                          {t.hinweis && <p className="mt-2 text-slate-300">{t.hinweis}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="green">Ja: {s.ja}</Badge>
                          <Badge tone="red">Nein: {s.nein}</Badge>
                          <Badge tone="yellow">Unsicher: {s.unsicher}</Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => toggleRolle(t.id, "pa_traeger")}
                          className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                            rollenState(t.id).pa_traeger
                              ? "border-yellow-300/25 bg-yellow-300/10 text-yellow-300"
                              : "border-slate-500/30 bg-slate-700/10 text-slate-300"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            PA-Träger
                          </span>
                        </button>
                        <button
                          onClick={() => toggleRolle(t.id, "maschinist")}
                          className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                            rollenState(t.id).maschinist
                              ? "border-yellow-300/25 bg-yellow-300/10 text-yellow-300"
                              : "border-slate-500/30 bg-slate-700/10 text-slate-300"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Maschinist
                          </span>
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => setAntwort(t.id, "ja")}
                          disabled={speichern}
                          className={`rounded-2xl border px-4 py-2 font-medium transition ${
                            meine?.status === "ja"
                              ? "border-green-300 bg-green-500/35 text-white shadow-[0_0_20px_rgba(34,197,94,0.35)]"
                              : "border-green-400/25 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                          }`}
                        >
                          Ja
                        </button>
                        <button
                          onClick={() => setAntwort(t.id, "nein")}
                          disabled={speichern}
                          className={`rounded-2xl border px-4 py-2 font-medium transition ${
                            meine?.status === "nein"
                              ? "border-red-300 bg-red-500/35 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                              : "border-red-400/25 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          }`}
                        >
                          Nein
                        </button>
                        <button
                          onClick={() => setAntwort(t.id, "unsicher")}
                          disabled={speichern}
                          className={`rounded-2xl border px-4 py-2 font-medium transition ${
                            meine?.status === "unsicher"
                              ? "border-yellow-200 bg-yellow-300/35 text-white shadow-[0_0_20px_rgba(250,204,21,0.35)]"
                              : "border-yellow-300/25 bg-yellow-300/10 text-yellow-300 hover:bg-yellow-300/20"
                          }`}
                        >
                          Unsicher
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border border-yellow-300/10 bg-[#111c2f] p-3">
                        <div className="text-sm text-slate-400">Deine Antwort</div>
                        <div className="font-semibold text-white">{meine?.status || "keine"}</div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-sm font-semibold text-yellow-300">
                          Alle Rückmeldungen
                        </div>
                        <div className="space-y-2">
                          {alleAntworten(t.id).length === 0 ? (
                            <div className="rounded-xl border border-yellow-300/10 bg-[#111c2f] p-3 text-slate-400">
                              Noch keine Rückmeldungen
                            </div>
                          ) : (
                            alleAntworten(t.id).map((r, i) => {
                              const p = r.profile_id ? profilesById[r.profile_id] : null;
                              const tp = r.teilnehmer_id ? teilnehmerById[r.teilnehmer_id] : null;
                              const anzeigeName = tp
                                ? nameAusTeilnehmer(tp)
                                : r.teilnehmer_vorname || r.teilnehmer_name
                                ? `${r.teilnehmer_vorname || ""} ${r.teilnehmer_name || ""}`.trim()
                                : nameAusProfil(p);
                              const anzeigeOrtswehr = tp
                                ? ortswehrText(tp.ortswehr)
                                : r.teilnehmer_ortswehr
                                ? ortswehrText(r.teilnehmer_ortswehr)
                                : ortswehrText(p?.ortswehr);

                              return (
                                <div
                                  key={`${t.id}-${i}`}
                                  className="rounded-xl border border-yellow-300/10 bg-[#111c2f] p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-white">
                                      {anzeigeName}{" "}
                                      <span className="text-slate-400">({anzeigeOrtswehr})</span>
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
                                  <div className="mt-2 text-xs text-slate-300">
                                    Funktion:{" "}
                                    {r.rolle === "beide"
                                      ? "PA-Träger + Maschinist"
                                      : r.rolle === "maschinist"
                                      ? "Maschinist"
                                      : r.rolle === "pa_traeger"
                                      ? "PA-Träger"
                                      : "keine"}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3">
        {icon}
        <div className="w-full">{children}</div>
      </div>
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
    <span className={`rounded-full border px-3 py-1 text-xs md:text-sm font-medium ${styles}`}>
      {children}
    </span>
  );
}
