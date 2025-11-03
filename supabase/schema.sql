-- Table: queue_requests
create table if not exists public.queue_requests (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	student_name text not null,
	topic_area text,
	status text not null default 'waiting' check (status in ('waiting','seen'))
);

-- Enable Row Level Security
alter table public.queue_requests enable row level security;

-- Policies
-- 1) Allow anyone (anon) to insert a request for the public form
create policy if not exists "Public can insert queue request"
	on public.queue_requests for insert
	to anon
	with check (true);

-- 2) Allow authenticated users (tutors) to select all rows
create policy if not exists "Authenticated can read all"
	on public.queue_requests for select
	to authenticated
	using (true);

-- 3) Allow authenticated to update status
create policy if not exists "Authenticated can update status"
	on public.queue_requests for update
	to authenticated
	using (true)
	with check (true);

-- 4) Allow authenticated to delete rows
create policy if not exists "Authenticated can delete rows"
	on public.queue_requests for delete
	to authenticated
	using (true);

