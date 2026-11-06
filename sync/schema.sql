-- Run once in the chosen Supabase project. No service key belongs in the website.
create table public.study_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint study_progress_size check (octet_length(data::text) <= 15000000)
);
alter table public.study_progress enable row level security;
revoke all on public.study_progress from anon, authenticated;
grant select on public.study_progress to authenticated;
create policy "Read own study progress" on public.study_progress
  for select to authenticated using ((select auth.uid()) = user_id);

-- Compare-and-swap prevents two devices overwriting each other's recent changes.
create function public.sync_study_progress(expected_revision bigint, progress jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); current_row public.study_progress;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(progress) <> 'object' or octet_length(progress::text) > 15000000 then
    raise exception 'Invalid progress';
  end if;
  insert into public.study_progress(user_id) values(uid) on conflict do nothing;
  select * into current_row from public.study_progress where user_id = uid for update;
  if current_row.revision <> expected_revision then
    return jsonb_build_object('ok',false,'data',current_row.data,'revision',current_row.revision);
  end if;
  update public.study_progress set data=progress, revision=revision+1, updated_at=now()
    where user_id=uid returning * into current_row;
  return jsonb_build_object('ok',true,'data',current_row.data,'revision',current_row.revision);
end $$;
revoke all on function public.sync_study_progress(bigint,jsonb) from public, anon;
grant execute on function public.sync_study_progress(bigint,jsonb) to authenticated;
