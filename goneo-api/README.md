# goneo-Betrieb

Die API wird unter `/api/` derselben Domain wie der statische Export betrieben. `config.local.php` wird ausschließlich aus `.env.goneo.local` erzeugt und niemals committed.

1. `.env.goneo.example` als `.env.goneo.local` kopieren und ausschließlich die eigenen Terminabfrage-Werte eintragen.
2. Neue zufällige Werte für Sitzungs- und Admin-Secret verwenden; keine Werte aus anderen Projekten übernehmen.
3. `node scripts/render-goneo-config.mjs` ausführen.
4. `schema.sql` in die ausschließlich für Terminabfrage vorgesehene MySQL-Datenbank importieren.
5. Den Inhalt von `goneo-api/` ohne `schema.sql`, `README.md` und `config.example.php` nach `api/` laden.
6. Zuerst `/api/health` testen. Import- oder Installationshilfen nach Verwendung löschen.

Die API akzeptiert CORS nur von `https://termine.feuerwehrfelm.de` und `http://localhost:3000`. Schreibzugriffe erfordern eine signierte Sitzung; Terminänderungen zusätzlich die Admin-Rolle.
