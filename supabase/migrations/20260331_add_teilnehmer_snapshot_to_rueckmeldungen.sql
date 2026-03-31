alter table public.rueckmeldungen
add column if not exists teilnehmer_vorname text,
add column if not exists teilnehmer_name text,
add column if not exists teilnehmer_ortswehr text;

update public.rueckmeldungen r
set
  teilnehmer_vorname = t.vorname,
  teilnehmer_name = t.name,
  teilnehmer_ortswehr = t.ortswehr
from public.teilnehmer t
where r.teilnehmer_id = t.id
  and (
    r.teilnehmer_vorname is null
    or r.teilnehmer_name is null
    or r.teilnehmer_ortswehr is null
  );
