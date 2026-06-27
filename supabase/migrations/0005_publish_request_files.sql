alter table public.publish_requests
  add column if not exists content_format text not null default 'markdown',
  add column if not exists html text,
  add column if not exists file_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'publish_requests_content_format_check'
      and conrelid = 'public.publish_requests'::regclass
  ) then
    alter table public.publish_requests
      add constraint publish_requests_content_format_check check (content_format in ('markdown', 'html'));
  end if;
end;
$$;
