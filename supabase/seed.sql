insert into departments (id, name, approver_id, created_at) values
  ('d1', 'Engineering', 'u2', '2026-01-01T00:00:00Z'),
  ('d2', 'Finance',     'u3', '2026-01-01T00:00:00Z'),
  ('d3', 'Operations',  'u4', '2026-01-01T00:00:00Z');

insert into users (id, email, full_name, department_id, role, is_active, joining_date, created_at) values
  ('u1', 'alice@naenda.co.tz', 'Alice Mwangi', 'd1', 'employee', true, '2024-01-15', '2024-01-15T00:00:00Z'),
  ('u2', 'bob@naenda.co.tz',   'Bob Kimani',   'd1', 'manager',  true, '2023-06-01', '2023-06-01T00:00:00Z'),
  ('u3', 'carol@naenda.co.tz', 'Carol Njeri',  'd2', 'hr',       true, '2023-03-01', '2023-03-01T00:00:00Z'),
  ('u4', 'david@naenda.co.tz', 'David Osei',   'd3', 'manager',  true, '2023-08-15', '2023-08-15T00:00:00Z'),
  ('u5', 'eve@naenda.co.tz',   'Eve Banda',    null, 'gm',       true, '2022-01-01', '2022-01-01T00:00:00Z'),
  ('u6', 'frank@naenda.co.tz', 'Frank Mutiso', null, 'admin',    true, '2022-01-01', '2022-01-01T00:00:00Z');

insert into leave_balances (id, user_id, leave_type, balance, last_reset_at) values
  ('lb-u1-0','u1','work_cycle',0,null),('lb-u1-1','u1','public_holiday',0,null),('lb-u1-2','u1','annual',0,null),('lb-u1-3','u1','sick_full',63,null),('lb-u1-4','u1','sick_half',63,null),('lb-u1-5','u1','compassionate',7,null),
  ('lb-u2-0','u2','work_cycle',0,null),('lb-u2-1','u2','public_holiday',0,null),('lb-u2-2','u2','annual',0,null),('lb-u2-3','u2','sick_full',63,null),('lb-u2-4','u2','sick_half',63,null),('lb-u2-5','u2','compassionate',7,null),
  ('lb-u3-0','u3','work_cycle',0,null),('lb-u3-1','u3','public_holiday',0,null),('lb-u3-2','u3','annual',0,null),('lb-u3-3','u3','sick_full',63,null),('lb-u3-4','u3','sick_half',63,null),('lb-u3-5','u3','compassionate',7,null),
  ('lb-u4-0','u4','work_cycle',0,null),('lb-u4-1','u4','public_holiday',0,null),('lb-u4-2','u4','annual',0,null),('lb-u4-3','u4','sick_full',63,null),('lb-u4-4','u4','sick_half',63,null),('lb-u4-5','u4','compassionate',7,null),
  ('lb-u5-0','u5','work_cycle',0,null),('lb-u5-1','u5','public_holiday',0,null),('lb-u5-2','u5','annual',0,null),('lb-u5-3','u5','sick_full',63,null),('lb-u5-4','u5','sick_half',63,null),('lb-u5-5','u5','compassionate',7,null),
  ('lb-u6-0','u6','work_cycle',0,null),('lb-u6-1','u6','public_holiday',0,null),('lb-u6-2','u6','annual',0,null),('lb-u6-3','u6','sick_full',63,null),('lb-u6-4','u6','sick_half',63,null),('lb-u6-5','u6','compassionate',7,null);

insert into leave_requests (id, user_id, leave_type, start_date, end_date, days_requested, status, current_stage, notes, created_at, updated_at) values
  ('lr1','u1','annual','2026-04-07','2026-04-11',5,'pending','manager','Family vacation','2026-03-20T09:00:00Z','2026-03-20T09:00:00Z'),
  ('lr2','u4','sick_full','2026-03-24','2026-03-25',2,'approved',null,'Flu','2026-03-23T08:00:00Z','2026-03-24T10:00:00Z');

insert into public_holidays (id, date, name, year) values
  ('ph1','2026-01-01','New Year''s Day',2026),('ph2','2026-04-07','Karume Day',2026),
  ('ph3','2026-04-26','Union Day',2026),('ph4','2026-05-01','Workers Day',2026),
  ('ph5','2026-07-07','Saba Saba Day',2026),('ph6','2026-08-08','Nane Nane Day',2026),
  ('ph7','2026-10-14','Nyerere Day',2026),('ph8','2026-12-09','Independence Day',2026),
  ('ph9','2026-12-25','Christmas Day',2026),('ph10','2026-12-26','Boxing Day',2026);
