alter table public.rueckmeldungen
add column if not exists rolle text;

alter table public.rueckmeldungen
drop constraint if exists rueckmeldungen_rolle_check;

alter table public.rueckmeldungen
add constraint rueckmeldungen_rolle_check
check (rolle in ('pa_traeger', 'maschinist') or rolle is null);
