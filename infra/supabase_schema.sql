create table if not exists videos (
  id text primary key,
  url text not null,
  title text,
  channel text,
  thumb text,
  duration_sec int,
  created_at timestamptz default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  video_id text references videos(id) on delete cascade,
  consensus_rating text,
  consensus_summary text,
  locale text,
  model text,
  took_ms int,
  created_at timestamptz default now()
);

create table if not exists claims (
  id text primary key,
  analysis_id uuid references analyses(id) on delete cascade,
  text text,
  rating text,
  rationale text,
  spans jsonb
);

create table if not exists claim_sources (
  id uuid primary key default gen_random_uuid(),
  claim_id text references claims(id) on delete cascade,
  title text,
  url text
);

create index on analyses (video_id, created_at desc);