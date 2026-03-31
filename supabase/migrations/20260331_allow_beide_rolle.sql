alter table public.rueckmeldungen
drop constraint if exists rueckmeldungen_rolle_check;

alter table public.rueckmeldungen
add constraint rueckmeldungen_rolle_check
check (rolle in ('pa_traeger', 'maschinist', 'beide') or rolle is null);
