create table if not exists public.teilnehmer (
  id uuid primary key default gen_random_uuid(),
  vorname text not null,
  name text not null,
  ortswehr text not null,
  created_at timestamp with time zone not null default now()
);

create unique index if not exists teilnehmer_identity_unique
on public.teilnehmer (lower(vorname), lower(name), lower(ortswehr));

alter table public.rueckmeldungen
add column if not exists teilnehmer_id uuid references public.teilnehmer(id) on delete cascade;

create unique index if not exists rueckmeldungen_termin_teilnehmer_unique
on public.rueckmeldungen (termin_id, teilnehmer_id);
