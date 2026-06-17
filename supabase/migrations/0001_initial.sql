create extension if not exists pgcrypto;

create type public.member_role as enum ('pending', 'member', 'admin');
create type public.publish_request_status as enum ('draft', 'submitted', 'approved', 'rejected', 'published');
create type public.content_type as enum ('press', 'topic', 'daily-review', 'study-log', 'teach');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  slug text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.member_role not null default 'pending',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_index (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  type public.content_type not null,
  title text not null,
  status text not null default 'published',
  visibility text not null default 'public',
  author text,
  member_slug text,
  category text,
  tags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, slug)
);

create table public.publish_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null,
  type public.content_type not null,
  category text,
  tags text[] not null default '{}',
  markdown text not null,
  status public.publish_request_status not null default 'submitted',
  reviewer_id uuid references auth.users(id),
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type public.content_type not null,
  content_slug text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type public.content_type not null,
  content_slug text not null,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_slug, reaction)
);

create table public.views (
  id uuid primary key default gen_random_uuid(),
  content_type public.content_type not null,
  content_slug text not null,
  viewed_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger member_roles_touch_updated_at before update on public.member_roles for each row execute function public.touch_updated_at();
create trigger content_index_touch_updated_at before update on public.content_index for each row execute function public.touch_updated_at();
create trigger publish_requests_touch_updated_at before update on public.publish_requests for each row execute function public.touch_updated_at();
create trigger comments_touch_updated_at before update on public.comments for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8)
  )
  on conflict (id) do nothing;

  insert into public.member_roles (user_id, role)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.member_roles where user_id = uid and role = 'admin');
$$;

create or replace function public.is_approved_member(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.member_roles where user_id = uid and role in ('member', 'admin'));
$$;

alter table public.profiles enable row level security;
alter table public.member_roles enable row level security;
alter table public.content_index enable row level security;
alter table public.publish_requests enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.views enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "users read own role" on public.member_roles for select using (auth.uid() = user_id or public.is_admin());
create policy "admins update roles" on public.member_roles for update using (public.is_admin()) with check (public.is_admin());

create policy "public content index is readable" on public.content_index for select using (visibility = 'public' and status = 'published');
create policy "admins manage content index" on public.content_index for all using (public.is_admin()) with check (public.is_admin());

create policy "members create publish requests" on public.publish_requests for insert with check (auth.uid() = user_id and public.is_approved_member());
create policy "users read own publish requests" on public.publish_requests for select using (auth.uid() = user_id or public.is_admin());
create policy "admins update publish requests" on public.publish_requests for update using (public.is_admin()) with check (public.is_admin());

create policy "comments are readable" on public.comments for select using (true);
create policy "members create comments" on public.comments for insert with check (auth.uid() = user_id and public.is_approved_member());
create policy "users manage own comments" on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own comments" on public.comments for delete using (auth.uid() = user_id);

create policy "reactions are readable" on public.reactions for select using (true);
create policy "members create reactions" on public.reactions for insert with check (auth.uid() = user_id and public.is_approved_member());
create policy "users delete own reactions" on public.reactions for delete using (auth.uid() = user_id);

create policy "views can be inserted by anyone" on public.views for insert with check (true);
create policy "admins read views" on public.views for select using (public.is_admin());
