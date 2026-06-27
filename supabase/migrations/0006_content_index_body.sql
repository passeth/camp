alter table public.content_index
  add column if not exists content_format text not null default 'markdown',
  add column if not exists content text,
  add column if not exists excerpt text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_index_content_format_check'
      and conrelid = 'public.content_index'::regclass
  ) then
    alter table public.content_index
      add constraint content_index_content_format_check check (content_format in ('markdown', 'html'));
  end if;
end;
$$;
