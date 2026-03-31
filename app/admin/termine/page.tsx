"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { CalendarDays, FileText, ShieldCheck, Trash2 } from "lucide-react";

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

export default function AdminTerminePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("");
  const [hinweis, setHinweis] = useState("");

  const formatUhrzeit = (uhrzeit: string | null) => {
    if (!uhrzeit) return "";
    const [hh, mm] = uhrzeit.split(":");
    if (!hh || !mm) return uhrzeit;
    return `${hh}:${mm}`;
  };

  const loadTermine = async () => {
    const { data, error } = await supabase
      .from("termine")
      .select("id, titel, datum, uhrzeit, hinweis")
      .order("datum", { ascending: true });

    if (error) {
      alert("Termine konnten nicht geladen werden: " + error.message);
      return;
    }

    setTermine((data as Termin[]) || []);
  };

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
        window.location.href = "/dashboard";
        return;
      }

      if (data.role !== "admin") {
        alert("Kein Zugriff. Nur Admin darf Termine anlegen.");
        window.location.href = "/dashboard";
        return;
      }

      setProfile(data);
      await loadTermine();
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleCreateTermin = async () => {
    if (!titel.trim() || !datum) {
      alert("Bitte Titel und Datum ausfüllen.");
      return;
    }

    if (!profile) return;

    const { error } = await supabase.from("termine").insert({
      titel: titel.trim(),
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
    await loadTermine();
  };

  const handleDeleteTermin = async (termin: Termin) => {
    const bestaetigt = window.confirm(
      `Termin "${termin.titel}" am ${termin.datum} wirklich löschen?`
    );
    if (!bestaetigt) return;

    setDeletingId(termin.id);

    const { error: rueckError } = await supabase
      .from("rueckmeldungen")
      .delete()
      .eq("termin_id", termin.id);

    if (rueckError) {
      setDeletingId(null);
      alert("Fehler beim Löschen der Rückmeldungen: " + rueckError.message);
      return;
    }

    const { error } = await supabase.from("termine").delete().eq("id", termin.id);

    setDeletingId(null);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    setTermine((prev) => prev.filter((t) => t.id !== termin.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081120] text-white flex items-center justify-center">
        Lade...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081120] text-white relative overflow-hidden p-6">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl border border-yellow-300/25 bg-[#0d1728]/85 p-6 shadow-[0_0_40px_rgba(250,204,21,0.08)]">
          <div className="mb-2 flex items-center gap-2 text-yellow-300">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
              Admin-Bereich
            </span>
          </div>
          <h1 className="text-3xl font-bold">Termin anlegen</h1>
          <p className="mt-2 text-slate-400">Angemeldet als {profile?.name}</p>
        </div>

        <div className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/85 p-6 space-y-5">
          <Field label="Titel" icon={<FileText className="h-4 w-4 text-yellow-300" />}>
            <input
              type="text"
              placeholder="z. B. Ausbildungsdienst"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Datum" icon={<CalendarDays className="h-4 w-4 text-yellow-300" />}>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="w-full bg-transparent text-white outline-none"
              />
            </Field>

            <Field label="Uhrzeit" icon={<CalendarDays className="h-4 w-4 text-yellow-300" />}>
              <input
                type="time"
                value={uhrzeit}
                onChange={(e) => setUhrzeit(e.target.value)}
                className="w-full bg-transparent text-white outline-none"
              />
            </Field>
          </div>

          <Field label="Hinweis" icon={<FileText className="h-4 w-4 text-yellow-300" />}>
            <textarea
              placeholder="Optionaler Hinweis"
              value={hinweis}
              onChange={(e) => setHinweis(e.target.value)}
              className="min-h-[110px] w-full resize-none bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </Field>

          <button
            onClick={handleCreateTermin}
            className="w-full rounded-2xl bg-yellow-300 px-4 py-3 font-semibold text-[#081120] transition hover:bg-yellow-200"
          >
            Termin speichern
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-yellow-300/20 bg-[#0d1728]/85 p-6">
          <h2 className="text-xl font-semibold text-yellow-300">Vorhandene Termine</h2>
          <p className="mt-1 text-sm text-slate-400">
            Hier kannst du bestehende Termine löschen.
          </p>

          <div className="mt-4 space-y-3">
            {termine.length === 0 ? (
              <div className="rounded-2xl border border-yellow-300/10 bg-[#111c2f] p-4 text-slate-400">
                Noch keine Termine vorhanden.
              </div>
            ) : (
              termine.map((termin) => (
                <div
                  key={termin.id}
                  className="flex flex-col gap-3 rounded-2xl border border-yellow-300/10 bg-[#111c2f] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{termin.titel}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {termin.datum} {formatUhrzeit(termin.uhrzeit)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTermin(termin)}
                    disabled={deletingId === termin.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === termin.id ? "Lösche..." : "Löschen"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
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
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 focus-within:border-yellow-300/50">
        {icon}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
