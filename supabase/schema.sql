-- NinjaCuts provisionssystem - Supabase schema

create table if not exists employees (
  id bigint generated always as identity primary key,
  name text not null,
  rate numeric not null default 0,
  pin text not null
);

create table if not exists entries (
  id bigint generated always as identity primary key,
  emp_id bigint not null references employees(id) on delete cascade,
  amount numeric not null,
  note text,
  date date not null default current_date
);

alter table employees enable row level security;
alter table entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'employees' and policyname = 'anon all employees'
  ) then
    create policy "anon all employees" on employees for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'entries' and policyname = 'anon all entries'
  ) then
    create policy "anon all entries" on entries for all using (true) with check (true);
  end if;
end $$;

-- Valfritt testdata:
-- insert into employees (name, rate, pin) values ('Test Frisör', 10, '1234');
