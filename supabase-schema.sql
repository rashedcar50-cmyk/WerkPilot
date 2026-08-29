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
