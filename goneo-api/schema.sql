create table if not exists profiles (
  id char(36) primary key, email varchar(254) not null unique, password_hash varchar(255) not null,
  vorname varchar(120) null, name varchar(120) not null, ortswehr varchar(120) null,
  role enum('user','admin') not null default 'user', created_at timestamp not null default current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists termine (
  id char(36) primary key, titel varchar(200) not null, datum date not null, uhrzeit time null,
  hinweis text null, created_by char(36) null, created_at timestamp not null default current_timestamp,
  index idx_termine_datum (datum), constraint fk_termine_profile foreign key (created_by) references profiles(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists teilnehmer (
  id char(36) primary key, vorname varchar(120) not null, name varchar(120) not null, ortswehr varchar(120) not null,
  identity_key char(64) not null unique, created_at timestamp not null default current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists rueckmeldungen (
  id bigint unsigned not null auto_increment primary key, termin_id char(36) not null, profile_id char(36) null, teilnehmer_id char(36) null,
  teilnehmer_vorname varchar(120) null, teilnehmer_name varchar(120) null, teilnehmer_ortswehr varchar(120) null,
  status enum('ja','nein','unsicher') not null, rolle enum('pa_traeger','maschinist','beide') null,
  created_at timestamp not null default current_timestamp, updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique key uq_termin_profile (termin_id, profile_id), unique key uq_termin_teilnehmer (termin_id, teilnehmer_id),
  constraint chk_actor check ((profile_id is not null and teilnehmer_id is null) or (profile_id is null and teilnehmer_id is not null)),
  constraint fk_r_termin foreign key (termin_id) references termine(id) on delete cascade,
  constraint fk_r_profile foreign key (profile_id) references profiles(id) on delete cascade,
  constraint fk_r_teilnehmer foreign key (teilnehmer_id) references teilnehmer(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
