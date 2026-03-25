-- ── Enums ──────────────────────────────────────────────────────────────────
create type user_role as enum ('employee', 'manager', 'hr', 'gm', 'viewer', 'admin');
create type leave_type as enum ('work_cycle', 'public_holiday', 'annual', 'sick_full', 'sick_half', 'compassionate');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type approval_stage as enum ('manager', 'hr', 'gm');
create type approval_action as enum ('approved', 'rejected');
create type admin_action as enum (
  'create_user', 'update_user', 'delete_user', 'activate_user', 'deactivate_user',
  'assign_role', 'assign_department', 'reset_password', 'override_balance', 'update_setting'
);
create type notification_type as enum ('submitted', 'approved', 'rejected', 'reminder');

-- ── Departments ────────────────────────────────────────────────────────────
create table departments (
  id          text primary key,
  name        text not null unique,
  approver_id text,
  created_at  timestamptz not null default now()
);

-- ── Users ──────────────────────────────────────────────────────────────────
create table users (
  id            text primary key,
  email         text not null unique,
  full_name     text not null,
  department_id text references departments(id) on delete set null,
  role          user_role not null default 'employee',
  is_active     boolean not null default true,
  joining_date  date not null,
  created_at    timestamptz not null default now()
);

alter table departments
  add constraint fk_dept_approver foreign key (approver_id) references users(id) on delete set null;

-- ── Leave Balances ─────────────────────────────────────────────────────────
create table leave_balances (
  id            text primary key,
  user_id       text not null references users(id) on delete cascade,
  leave_type    leave_type not null,
  balance       numeric not null default 0,
  last_reset_at timestamptz,
  unique(user_id, leave_type)
);

-- ── Leave Requests ─────────────────────────────────────────────────────────
create table leave_requests (
  id             text primary key,
  user_id        text not null references users(id),
  leave_type     leave_type not null,
  start_date     date not null,
  end_date       date not null,
  days_requested numeric not null,
  status         leave_status not null default 'pending',
  current_stage  approval_stage,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Approval Logs ──────────────────────────────────────────────────────────
create table approval_logs (
  id               text primary key,
  leave_request_id text not null references leave_requests(id),
  approver_id      text not null references users(id),
  stage            approval_stage not null,
  action           approval_action not null,
  comment          text,
  created_at       timestamptz not null default now()
);

-- ── Public Holidays ────────────────────────────────────────────────────────
create table public_holidays (
  id   text primary key,
  date date not null unique,
  name text not null,
  year integer not null
);

-- ── Notifications ──────────────────────────────────────────────────────────
create table notifications (
  id         text primary key,
  user_id    text not null references users(id),
  type       notification_type not null,
  message    text not null,
  read       boolean not null default false,
  related_id text,
  created_at timestamptz not null default now()
);

-- Enable Realtime on notifications
alter publication supabase_realtime add table notifications;

-- ── Audit Logs ─────────────────────────────────────────────────────────────
create table audit_logs (
  id             text primary key,
  admin_id       text not null references users(id),
  action         admin_action not null,
  target_user_id text references users(id),
  details        text not null,
  created_at     timestamptz not null default now()
);

-- Enable RLS (service role bypasses it)
alter table departments enable row level security;
alter table users enable row level security;
alter table leave_balances enable row level security;
alter table leave_requests enable row level security;
alter table approval_logs enable row level security;
alter table public_holidays enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
