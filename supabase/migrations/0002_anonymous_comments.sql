alter table public.comments
  alter column user_id drop not null;

alter table public.comments
  add column if not exists author_name text not null default '익명';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_author_name_length'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_author_name_length check (char_length(trim(author_name)) between 1 and 80);
  end if;
end;
$$;

drop policy if exists "members create comments" on public.comments;
drop policy if exists "anyone create comments" on public.comments;

create policy "anyone create comments" on public.comments
  for insert
  with check (
    (
      user_id is null
      and char_length(trim(author_name)) between 1 and 80
      and char_length(body) between 1 and 2000
    )
    or (
      auth.uid() = user_id
      and public.is_approved_member()
    )
  );
