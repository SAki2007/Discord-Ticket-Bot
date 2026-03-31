create table if not exists public.tickets (
  id bigint generated always as identity primary key,
  ticket_id text generated always as ('ticket-' || lpad(id::text, 6, '0')) stored unique,
  guild_id text not null,
  channel_id text unique,
  creator_user_id text not null,
  assigned_staff_user_id text,
  status text not null default 'open' check (status in ('open', 'claimed', 'closed')),
  category text,
  title text not null,
  description text not null,
  priority text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  close_reason text
);

create table if not exists public.staff_members (
  id bigint generated always as identity primary key,
  guild_id text not null,
  staff_user_id text not null,
  is_active boolean not null default true,
  last_assigned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (guild_id, staff_user_id)
);

create table if not exists public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  discord_message_id text not null unique,
  author_user_id text not null,
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  source text not null check (source in ('discord', 'dashboard')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  event_type text not null,
  actor_user_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_updated_at_tickets on public.tickets;
create trigger set_updated_at_tickets
before update on public.tickets
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_staff_members on public.staff_members;
create trigger set_updated_at_staff_members
before update on public.staff_members
for each row
execute function public.set_updated_at();

create unique index if not exists tickets_one_active_per_creator_idx
  on public.tickets (guild_id, creator_user_id)
  where status in ('open', 'claimed');

create index if not exists tickets_by_channel_idx
  on public.tickets (channel_id);

create index if not exists tickets_by_assigned_staff_active_idx
  on public.tickets (guild_id, assigned_staff_user_id)
  where status in ('open', 'claimed');

create index if not exists staff_members_active_idx
  on public.staff_members (guild_id, is_active, last_assigned_at);

create index if not exists ticket_messages_ticket_id_created_at_idx
  on public.ticket_messages (ticket_id, created_at);

create index if not exists ticket_events_ticket_id_created_at_idx
  on public.ticket_events (ticket_id, created_at);
