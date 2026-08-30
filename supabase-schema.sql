-- WerkPilot: إصلاح الجداول + فتح الكتابة للتجربة
-- الصق في: Supabase → SQL Editor → Run

-- ===== purchases: إضافة الأعمدة الناقصة =====
alter table purchases add column if not exists supplier text;
alter table purchases add column if not exists item text;
alter table purchases add column if not exists qty numeric default 1;
alter table purchases add column if not exists price numeric default 0;
alter table purchases add column if not exists receipt_url text;
alter table purchases add column if not exists invoice_number text;
alter table purchases add column if not exists subtotal numeric default 0;
alter table purchases add column if not exists tax_amount numeric default 0;
alter table purchases add column if not exists total_amount numeric default 0;
alter table purchases add column if not exists purchase_date date;
alter table purchases add column if not exists payment_status text default 'pending';
alter table purchases add column if not exists notes text;
alter table purchases add column if not exists company_id text;

-- ===== customers =====
alter table customers add column if not exists name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists email text;
alter table customers add column if not exists address text;
alter table customers add column if not exists company_id text;

-- ===== vehicles =====
alter table vehicles add column if not exists plate text;
alter table vehicles add column if not exists vin text;
alter table vehicles add column if not exists make text;
alter table vehicles add column if not exists model text;
alter table vehicles add column if not exists year text;
alter table vehicles add column if not exists engine text;
alter table vehicles add column if not exists paint text;
alter table vehicles add column if not exists customer_id text;
alter table vehicles add column if not exists company_id text;

-- ===== inventory =====
alter table inventory add column if not exists sku text;
alter table inventory add column if not exists name text;
alter table inventory add column if not exists qty numeric default 0;
alter table inventory add column if not exists buy numeric default 0;
alter table inventory add column if not exists sell numeric default 0;
alter table inventory add column if not exists company_id text;

-- ===== companies =====
alter table companies add column if not exists name text;
alter table companies add column if not exists country text default 'DE';
alter table companies add column if not exists currency text default 'EUR';

insert into companies (id, name, country, currency)
values
  ('de', 'Auto Service', 'DE', 'EUR'),
  ('es', 'Auto Service España', 'ES', 'EUR')
on conflict (id) do update set name = excluded.name;

-- ===== RLS: فتح للتجربة (anon) =====
-- ملاحظة: لاحقاً نقيدها مع تسجيل دخول حقيقي

alter table purchases enable row level security;
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table inventory enable row level security;
alter table companies enable row level security;

drop policy if exists "wp_purchases_all" on purchases;
create policy "wp_purchases_all" on purchases for all using (true) with check (true);

drop policy if exists "wp_customers_all" on customers;
create policy "wp_customers_all" on customers for all using (true) with check (true);

drop policy if exists "wp_vehicles_all" on vehicles;
create policy "wp_vehicles_all" on vehicles for all using (true) with check (true);

drop policy if exists "wp_inventory_all" on inventory;
create policy "wp_inventory_all" on inventory for all using (true) with check (true);

drop policy if exists "wp_companies_all" on companies;
create policy "wp_companies_all" on companies for all using (true) with check (true);

-- تأكيد bucket الإيصالات (إذا مش موجود أنشئه من Storage يدوياً: purchase-receipts / Public)

-- ===== v2: تشغيل الورشة الكامل =====
alter table vehicles add column if not exists km numeric;
alter table vehicles add column if not exists next_service_km numeric;
alter table vehicles add column if not exists photo text;
alter table inventory add column if not exists min_qty numeric default 3;

create table if not exists repairs (
  id bigint generated always as identity primary key,
  company_id text,
  vehicle_id text,
  description text,
  complaint text,
  tech text,
  hours numeric default 0,
  status text,
  km numeric,
  fuel text,
  jobs text,
  parts text,
  repair_date date,
  created_at timestamptz default now()
);

create table if not exists appointments (
  id bigint generated always as identity primary key,
  company_id text,
  vehicle_id text,
  customer_id text,
  appt_date date,
  appt_time text,
  tech text,
  note text,
  status text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id bigint generated always as identity primary key,
  company_id text,
  vehicle_id text,
  repair_id text,
  number text,
  type text,
  parts numeric default 0,
  labor numeric default 0,
  discount numeric default 0,
  tax numeric default 19,
  net numeric default 0,
  total numeric default 0,
  payment text,
  paid boolean default false,
  lines text,
  issued_at timestamptz default now()
);

create table if not exists expenses (
  id bigint generated always as identity primary key,
  company_id text,
  expense_date date,
  note text,
  amount numeric default 0,
  category text,
  created_at timestamptz default now()
);

alter table repairs enable row level security;
alter table appointments enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;

drop policy if exists "wp_repairs_all" on repairs;
create policy "wp_repairs_all" on repairs for all using (true) with check (true);
drop policy if exists "wp_appointments_all" on appointments;
create policy "wp_appointments_all" on appointments for all using (true) with check (true);
drop policy if exists "wp_invoices_all" on invoices;
create policy "wp_invoices_all" on invoices for all using (true) with check (true);
drop policy if exists "wp_expenses_all" on expenses;
create policy "wp_expenses_all" on expenses for all using (true) with check (true);

alter table repairs add column if not exists photos text;

