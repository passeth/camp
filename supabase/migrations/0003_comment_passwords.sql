alter table public.comments
  add column if not exists password_hash text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_password_hash_length'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_password_hash_length check (password_hash is null or char_length(password_hash) between 32 and 255);
  end if;
end;
$$;
