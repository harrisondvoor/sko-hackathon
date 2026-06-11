create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  role_mode text not null check (role_mode in ('mentor', 'mentee', 'both')),
  job_title text not null,
  org text not null,
  location text,
  timezone text,
  availability text,
  mentoring_style text,
  skills_offered text[] not null default '{}',
  skills_wanted text[] not null default '{}',
  goals text[] not null default '{}',
  prompts jsonb not null default '[]'::jsonb,
  photo_url text,
  updated_at timestamptz not null default now()
);

create table public.mentorship_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  preferred_roles text[] not null default '{}',
  preferred_timezones text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  meeting_cadence text,
  updated_at timestamptz not null default now()
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('like', 'pass')),
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a_id, user_b_id),
  check (user_a_id <> user_b_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.mentorship_preferences enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
