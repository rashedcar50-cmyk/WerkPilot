-- WerkPilot Schema for Supabase
-- نفّذ هذا في: Supabase Dashboard → SQL Editor → New query → Run

-- تفعيل UUID إن لزم
create extension if not exists "pgcrypto";

-- الشركات
create table if not exists companies (
  id text primary key,
  name text not null,
  country text default 'DE',
  currency text default 'EUR',
  doc_lang text default 'de',
  created_at timestamptz default now()
);

-- العملاء
create table if not exists customers (
  id text primary key,
  company_id text references companies(id),
  name text not null,
  phone text,
  email text,
  address text,
  document_name text,
  created_at timestamptz default now()
);

-- السيارات
create table if not exists vehicles (
  id text primary key,
  company_id text references companies(id),
  customer_id text references customers(id),
  plate text,
  vin text,
  make text,
  model text,
  year text,
  engine text,
  paint text,
  document_name text,
  created_at timestamptz default now()
);

-- المشتريات
create table if not exists purchases (
  id text primary key,
  company_id text references companies(id),
  supplier text,
  invoice_number text,
  item text,
  qty numeric default 1,
  price numeric default 0,
  subtotal numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  date date,
  payment_status text default 'pending',
  notes text,
  receipt_url text,
  created_at timestamptz default now()
);

-- المخزون
create table if not exists inventory (
  id text primary key,
  company_id text references companies(id),
  sku text,
  name text,
  qty numeric default 0,
  buy numeric default 0,
  sell numeric default 0,
  created_at timestamptz default now()
);

-- أوامر الإصلاح
create table if not exists repairs (
  id text primary key,
  company_id text references companies(id),
  vehicle_id text references vehicles(id),
  description text,
  tech text,
  hours numeric default 0,
  status text default 'جديد',
  created_at timestamptz default now()
);

-- الفواتير
create table if not exists invoices (
  id text primary key,
  company_id text references companies(id),
  vehicle_id text,
  type text,
  parts numeric default 0,
  labor numeric default 0,
  discount numeric default 0,
  tax numeric default 19,
  net numeric default 0,
  total numeric default 0,
  payment text,
  date timestamptz,
  created_at timestamptz default now()
);

-- بيانات أولية للشركات
insert into companies (id, name, country, currency, doc_lang) values
  ('de', 'Auto Service', 'DE', 'EUR', 'de'),
  ('es', 'Auto Service España', 'ES', 'EUR', 'es')
on conflict (id) do nothing;

-- سياسات مفتوحة للتجربة (anon) — لاحقاً نقيدها مع Auth
alter table companies enable row level security;
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table purchases enable row level security;
alter table inventory enable row level security;
alter table repairs enable row level security;
alter table invoices enable row level security;

-- سياسات قراءة/كتابة للـ anon (نسخة تجريبية)
do $$ begin
  create policy "anon_all_companies" on companies for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_customers" on customers for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_vehicles" on vehicles for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_purchases" on purchases for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_inventory" on inventory for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_repairs" on repairs for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "anon_all_invoices" on invoices for all using (true) with check (true);
exception when duplicate_object then null; end $$;
