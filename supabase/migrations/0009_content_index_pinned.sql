alter table public.content_index
  add column if not exists pinned boolean not null default false;

create index if not exists content_index_pinned_order_idx
  on public.content_index (pinned desc, published_at desc, created_at desc);
