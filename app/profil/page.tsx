"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, MapPin, Save, User } from "lucide-react";

type Profile = {
  id: string;
  vorname: string | null;
  name: string;
  ortswehr: string | null;
};

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileId, setProfileId] = useState("");
  const [vorname, setVorname] = useState("");
  const [name, setName] = useState("");
  const [ortswehr, setOrtswehr] = useState("");
  const [ortswehrOptionen, setOrtswehrOptionen] = useState<string[]>([]);

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
        .select("id, vorname, name, ortswehr")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        alert("Profil konnte nicht geladen werden.");
        setLoading(false);
        return;
      }

      const p = data as Profile;

      setProfileId(p.id);
      setVorname(p.vorname || "");
      setName(p.name || "");
      setOrtswehr(p.ortswehr || "");

      const { data: ortswehren, error: ortswehrError } = await supabase
        .from("profiles")
        .select("ortswehr");

      if (!ortswehrError && ortswehren) {
        const optionen = Array.from(
          new Set(
            ortswehren
              .map((o) => o.ortswehr?.trim())
              .filter((o): o is string => !!o)
          )
        );
        setOrtswehrOptionen(optionen);
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        vorname: vorname.trim(),
        name: name.trim(),
        ortswehr: ortswehr.trim(),
      })
      .eq("id", profileId);

    setSaving(false);

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    alert("Profil gespeichert.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081120] text-white flex items-center justify-center">
        Lade Profil...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081120] text-white relative overflow-hidden p-6">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="rounded-3xl border border-yellow-300/25 bg-[#0d1728]/85 p-6 shadow-[0_0_40px_rgba(250,204,21,0.08)]">
            <div className="mb-2 flex items-center gap-2 text-yellow-300">
              <User className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                Profil
              </span>
            </div>
            <h1 className="text-3xl font-bold">Deine Angaben</h1>
            <p className="mt-2 text-slate-400">
              Hier kannst du Vorname, Name und Ortswehr selbst pflegen.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="flex items-center gap-2 rounded-2xl border border-yellow-300/20 bg-[#111c2f] px-4 py-3 font-medium text-white transition hover:border-yellow-300/40 hover:bg-[#16243b]"
          >
            <ArrowLeft className="h-4 w-4 text-yellow-300" />
            Zurück
          </button>
        </div>

        <div className="rounded-3xl border border-yellow-300/20 bg-[#0d1728]/85 p-6 space-y-5">
          <Field label="Vorname" icon={<User className="h-4 w-4 text-yellow-300" />}>
            <input
              type="text"
              placeholder="Dein Vorname"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </Field>

          <Field label="Nachname" icon={<User className="h-4 w-4 text-yellow-300" />}>
            <input
              type="text"
              placeholder="Dein Nachname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </Field>

          <Field
            label="Ortswehr"
            icon={<MapPin className="h-4 w-4 text-yellow-300" />}
          >
            <input
              list="ortswehr-optionen-profil"
              value={ortswehr}
              onChange={(e) => setOrtswehr(e.target.value)}
              placeholder={
                ortswehrOptionen.length > 0 ? "Ortswehr wählen oder tippen" : "Ortswehr eingeben"
              }
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
            />
            <datalist id="ortswehr-optionen-profil">
              {ortswehrOptionen.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 py-3 font-semibold text-[#081120] transition hover:bg-yellow-200 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Speichert..." : "Profil speichern"}
          </button>
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
