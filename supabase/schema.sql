-- Nutri — esquema de base de datos para Supabase
-- Cómo usarlo: entra a tu proyecto en supabase.com → SQL Editor → pega todo esto → Run.
-- Crea una sola tabla "user_data" con una fila por usuario, que guarda todo lo que antes
-- vivía en localStorage (perfil, comidas, progreso, rutinas, alimentos personalizados).
-- La seguridad (RLS) asegura que cada quien solo pueda leer/escribir SUS propios datos.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  log jsonb not null default '{}'::jsonb,
  progress jsonb not null default '[]'::jsonb,
  routine jsonb not null default '[]'::jsonb,
  exercise_log jsonb not null default '{}'::jsonb,
  custom_foods jsonb not null default '[]'::jsonb,
  ai_recipes jsonb not null default '[]'::jsonb,
  ai_meal_plans jsonb not null default '[]'::jsonb,
  ai_routines jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Cada usuario solo puede ver y modificar su propia fila.
create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id);

-- Mantiene updated_at al día automáticamente en cada cambio.
create or replace function public.touch_user_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_user_data on public.user_data;
create trigger trg_touch_user_data
  before update on public.user_data
  for each row execute function public.touch_user_data_updated_at();

-- Crea automáticamente la fila de datos en cuanto alguien se registra,
-- para que la app nunca tenga que preocuparse por "crear la fila la primera vez".
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_data (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
