drop policy if exists "anyone create public content index" on public.content_index;

create policy "anyone create public content index" on public.content_index
  for insert
  with check (
    status = 'published'
    and visibility = 'public'
    and char_length(trim(slug)) between 1 and 160
    and char_length(trim(title)) between 1 and 160
    and (author is null or char_length(trim(author)) between 1 and 80)
    and (excerpt is null or char_length(excerpt) <= 240)
    and content is not null
    and char_length(content) between 1 and 500000
    and content_format in ('markdown', 'html')
  );
