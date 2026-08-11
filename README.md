# Terminabfrage

Termin- und Rückmeldungsverwaltung der Gemeindefeuerwehr Felm unter `https://termine.feuerwehrfelm.de`.

## Architektur

- statischer Next.js-Export im goneo-Webspace
- PHP-API unter `/api/`
- eigene goneo-MySQL-Datenbank
- installierbare PWA mit Manifest und Service Worker
- GitHub ausschließlich als Versionsverwaltung

Supabase und Vercel gehören nicht mehr zum aktiven Anwendungscode. Die bisherigen Dienste bleiben bis zur ausdrücklichen Freigabe als unveränderte Rückfallkopie bestehen.

## Entwicklung

```bash
npm install
npm run dev
npm run lint
npm run build
```

Der Produktions-Build erzeugt den statischen Export in `out/`. Lokale goneo-Zugangsdaten liegen ausschließlich in `.env.goneo.local`; die Datei ist git-ignoriert. Die benötigten Variablennamen stehen in `.env.goneo.example`.

Weitere Betriebs- und API-Hinweise stehen in `goneo-api/README.md`.
