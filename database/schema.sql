-- MSC-Leaves Database Schema
-- PostgreSQL / Supabase
-- © Daniel B Shayo

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────────────────────
create type user_role as enum ('employee', 'manager', 'hr', 'gm', 'viewer');
create type leave_type as enum ('work_cycle', 'public_holiday', 'annual', 'sick_full', 'sick_half', 'compassionate');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type approval_stage as enum ('manager', 'hr', 'gm');
create type approval_action as enum ('approved', 'rejected');
create type notification_type as enum ('submitted', 'approved', 'rejected', 'reminder');

-- ── Departments ──────────────────────────────────────────────────────────────
create table departments (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  approver_id   uuid,  -- set after users table exists
  created_at    timestamptz not null default now()
);

-- ── Users ────────────────────────────────────────────────────────────────────
create table users (
  id            uuid primary key default uuid_generate_v4(),
  auth_id       uuid unique,           -- Supabase auth.users.id
  email         text not null unique,
  full_name     text not null,
  department_id uuid references departments(id) on delete set null,
  role          user_role not null default 'employee',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Back-fill departments.approver_id FK
alter table departments
  add constraint fk_approver foreign key (approver_id)
  references users(id) on delete set null;

-- ── Leave Balances ───────────────────────────────────────────────────────────
create table leave_balances (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  leave_type    leave_type not null,
  balance       numeric(6,2) not null default 0 check (balance >= 0),
  last_reset_at timestamptz,
  updated_at    timestamptz not null default now(),
  unique (user_id, leave_type)
);

-- ── Leave Requests ───────────────────────────────────────────────────────────
create table leave_requests (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references users(id) on delete cascade,
  leave_type      leave_type not null,
  start_date      date not null,
  end_date        date not null,
  days_requested  integer not null check (days_requested > 0),
  status          leave_status not null default 'pending',
  current_stage   approval_stage,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint valid_dates check (end_date >= start_date)
);

-- ── Approval Logs ────────────────────────────────────────────────────────────
create table approval_logs (
  id               uuid primary key default uuid_generate_v4(),
  leave_request_id uuid not null references leave_requests(id) on delete cascade,
  approver_id      uuid not null references users(id),
  stage            approval_stage not null,
  action           approval_action not null,
  comment          text,
  created_at       timestamptz not null default now()
);

-- ── Public Holidays ──────────────────────────────────────────────────────────
create table public_holidays (
  id         uuid primary key default uuid_generate_v4(),
  date       date not null unique,
  name       text not null,
  year       integer not null generated always as (extract(year from date)::integer) stored
);

-- ── Notifications ────────────────────────────────────────────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  type        notification_type not null,
  message     text not null,
  read        boolean not null default false,
  related_id  uuid,  -- leave_request_id
  created_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index idx_users_department on users(department_id);
create index idx_users_role on users(role);
create index idx_leave_requests_user on leave_requests(user_id);
create index idx_leave_requests_status on leave_requests(status);
create index idx_leave_requests_dates on leave_requests(start_date, end_date);
create index idx_leave_requests_stage on leave_requests(current_stage);
create index idx_leave_balances_user on leave_balances(user_id);
create index idx_approval_logs_request on approval_logs(leave_request_id);
create index idx_notifications_user_unread on notifications(user_id, read) where read = false;
create index idx_public_holidays_date on public_holidays(date);

-- ── Functions ────────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger trg_leave_requests_updated_at
  before update on leave_requests
  for each row execute function update_updated_at();

create trigger trg_leave_balances_updated_at
  before update on leave_balances
  for each row execute function update_updated_at();

-- Initialize leave balances when a new user is created
create or replace function init_leave_balances()
returns trigger language plpgsql as $$
begin
  insert into leave_balances (user_id, leave_type, balance) values
    (new.id, 'work_cycle',    0),
    (new.id, 'public_holiday', 0),
    (new.id, 'annual',        28),
    (new.id, 'sick_full',     63),
    (new.id, 'sick_half',     63),
    (new.id, 'compassionate', 7);
  return new;
end;
$$;

create trigger trg_init_leave_balances
  after insert on users
  for each row execute function init_leave_balances();

-- Deduct leave balance on final approval (gm stage)
create or replace function deduct_leave_on_approval()
returns trigger language plpgsql as $$
begin
  -- Only deduct when status changes to 'approved' (from pending)
  if new.status = 'approved' and old.status <> 'approved' then
    update leave_balances
    set balance = greatest(0, balance - new.days_requested)
    where user_id = new.user_id
      and leave_type = new.leave_type;
  end if;
  return new;
end;
$$;

create trigger trg_deduct_leave_balance
  after update on leave_requests
  for each row execute function deduct_leave_on_approval();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table users enable row level security;
alter table departments enable row level security;
alter table leave_requests enable row level security;
alter table leave_balances enable row level security;
alter table approval_logs enable row level security;
alter table notifications enable row level security;
alter table public_holidays enable row level security;

-- Helper: get the current user's row from users table
create or replace function current_user_record()
returns users language sql security definer as $$
  select * from users where auth_id = auth.uid() limit 1;
$$;

-- Helper: get current user's role
create or replace function current_user_role()
returns user_role language sql security definer as $$
  select role from users where auth_id = auth.uid() limit 1;
$$;

-- Helper: get current user's department
create or replace function current_user_dept()
returns uuid language sql security definer as $$
  select department_id from users where auth_id = auth.uid() limit 1;
$$;

-- users: everyone can read; only gm/hr can write
create policy "users_select" on users for select using (true);
create policy "users_insert" on users for insert with check (
  current_user_role() in ('gm', 'hr')
);
create policy "users_update" on users for update using (
  current_user_role() in ('gm', 'hr') or auth_id = auth.uid()
);

-- departments: readable by all, writable by gm only
create policy "depts_select" on departments for select using (true);
create policy "depts_write" on departments for all using (current_user_role() = 'gm');

-- leave_requests: employees see own; managers see their dept; hr/gm see all
create policy "lr_select" on leave_requests for select using (
  user_id = (select id from users where auth_id = auth.uid())
  or current_user_role() in ('hr', 'gm')
  or (
    current_user_role() = 'manager'
    and (select department_id from users where id = leave_requests.user_id) = current_user_dept()
  )
);
create policy "lr_insert" on leave_requests for insert with check (
  user_id = (select id from users where auth_id = auth.uid())
);
create policy "lr_update" on leave_requests for update using (
  current_user_role() in ('manager', 'hr', 'gm')
);

-- leave_balances: users see own; managers see dept; hr/gm see all
create policy "lb_select" on leave_balances for select using (
  user_id = (select id from users where auth_id = auth.uid())
  or current_user_role() in ('hr', 'gm')
);
create policy "lb_update" on leave_balances for update using (
  current_user_role() in ('hr', 'gm')
);

-- approval_logs: readable by approvers and the request owner
create policy "al_select" on approval_logs for select using (
  current_user_role() in ('manager', 'hr', 'gm')
  or approver_id = (select id from users where auth_id = auth.uid())
);
create policy "al_insert" on approval_logs for insert with check (
  current_user_role() in ('manager', 'hr', 'gm')
);

-- notifications: users see own only
create policy "notif_select" on notifications for select using (
  user_id = (select id from users where auth_id = auth.uid())
);
create policy "notif_update" on notifications for update using (
  user_id = (select id from users where auth_id = auth.uid())
);

-- public holidays: readable by all, writable by gm
create policy "ph_select" on public_holidays for select using (true);
create policy "ph_write" on public_holidays for all using (current_user_role() = 'gm');

-- ── Tanzanian Public Holidays 2026 ───────────────────────────────────────────
insert into public_holidays (date, name) values
  ('2026-01-01', 'New Year''s Day'),
  ('2026-01-12', 'Zanzibar Revolution Day'),
  ('2026-04-07', 'Karume Day'),
  ('2026-04-10', 'Good Friday'),
  ('2026-04-13', 'Easter Monday'),
  ('2026-04-26', 'Union Day'),
  ('2026-05-01', 'Workers Day'),
  ('2026-06-07', 'Eid al-Fitr'),
  ('2026-08-13', 'Eid al-Adha'),
  ('2026-07-07', 'Saba Saba Day'),
  ('2026-08-08', 'Nane Nane Day'),
  ('2026-10-14', 'Nyerere Day'),
  ('2026-12-09', 'Independence Day'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Boxing Day')
on conflict (date) do nothing;
