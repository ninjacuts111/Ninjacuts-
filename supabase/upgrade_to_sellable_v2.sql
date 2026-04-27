create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;
drop policy if exists "anon all app_settings" on app_settings;
create policy "anon all app_settings" on app_settings for all using (true) with check (true);

insert into app_settings (key, value)
values ('manager_password', '0000')
on conflict (key) do nothing;

create table if not exists salons (
  id bigint generated always as identity primary key,
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

alter table salons enable row level security;
drop policy if exists "anon all salons" on salons;
create policy "anon all salons" on salons for all using (true) with check (true);
