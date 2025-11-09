-- Simple RLS example (adjust to your auth model)
alter table public.plants enable row level security;
alter table public.reminders enable row level security;
alter table public.journal enable row level security;
alter table public.plant_identifications enable row level security;

create policy "plants are viewable by owner" on public.plants
  for select using (auth.uid() = owner_id);
create policy "plants are insertable by owner" on public.plants
  for insert with check (auth.uid() = owner_id);
create policy "plants are updatable by owner" on public.plants
  for update using (auth.uid() = owner_id);
create policy "plants are deletable by owner" on public.plants
  for delete using (auth.uid() = owner_id);

create policy "plant identifications readable by owner" on public.plant_identifications
  for select using (auth.uid() = user_id);
create policy "plant identifications insertable by owner" on public.plant_identifications
  for insert with check (auth.uid() = user_id);
create policy "plant identifications updatable by owner" on public.plant_identifications
  for update using (auth.uid() = user_id);
create policy "plant identifications deletable by owner" on public.plant_identifications
  for delete using (auth.uid() = user_id);

create policy "reminders by owner" on public.reminders
  for all using (exists(select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()));

create policy "journal by owner" on public.journal
  for all using (exists(select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()));
