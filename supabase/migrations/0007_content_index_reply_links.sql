alter table public.content_index
  add column if not exists parent_type public.content_type,
  add column if not exists parent_slug text;

create index if not exists content_index_parent_idx
  on public.content_index (parent_type, parent_slug, published_at desc, created_at desc)
  where parent_type is not null and parent_slug is not null;
