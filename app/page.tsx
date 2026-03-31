import Link from "next/link";
import { Flame, LogIn, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#081120] text-white relative overflow-hidden">

      {/* Glow Effekte */}
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center px-6">

        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-yellow-300/30 bg-yellow-300/10 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
          <Flame className="h-10 w-10 text-yellow-300" />
        </div>

        {/* Titel */}
        <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 tracking-tight">
          Terminabfrage
        </h1>

        <p className="mt-4 max-w-xl text-slate-400 text-lg">
          Rückmeldung zu Diensten und Terminen ohne Passwort für die Mannschaft.
          Admins verwalten Termine im geschützten Bereich.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">

          <Link href="/teilnahme">
            <button className="flex items-center gap-2 rounded-2xl bg-yellow-300 px-6 py-3 font-semibold text-[#081120] hover:bg-yellow-200 transition">
              <Users className="h-4 w-4" />
              Zur Teilnahme
            </button>
          </Link>

          <Link href="/login">
            <button className="rounded-2xl border border-yellow-300/30 px-6 py-3 font-semibold text-white hover:bg-[#16243b] transition">
              <span className="inline-flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Admin Login
              </span>
            </button>
          </Link>

        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-slate-500">
          Feuerwehr Terminverwaltung • modern & einfach
        </p>

      </div>
    </div>
  );
}
