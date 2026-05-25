create extension if not exists "uuid-ossp";

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  legal_name text,
  gstin text,
  pan text,
  address text,
  state text,
  currency text default 'INR',
  financial_year_start date,
  logo_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table company_users (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','accountant','billing_user','approver','viewer','auditor')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id,user_id)
);

create table customers (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  customer_name text not null, legal_name text, gstin text, pan text, email text, phone text,
  billing_address text, state text, payment_terms int default 0, opening_balance numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table vendors (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  vendor_name text not null, gstin text, pan text, msme_status text, email text, phone text, address text, opening_balance numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table items (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  name text not null, hsn_sac text, gst_rate numeric(5,2) default 18, unit text, sales_rate numeric(14,2) default 0, purchase_rate numeric(14,2) default 0,
  income_account text, expense_account text,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table accounts (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  name text not null, type text not null check (type in ('asset','liability','income','expense','equity')), code text,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now(), unique(company_id,name)
);
create table invoices (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  customer_id uuid references customers(id), invoice_type text check(invoice_type in ('proforma','tax')) not null,
  invoice_no text, invoice_date date not null default current_date, due_date date, status text default 'draft',
  taxable_amount numeric(14,2) default 0, cgst numeric(14,2) default 0, sgst numeric(14,2) default 0, igst numeric(14,2) default 0, total_amount numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table invoice_items (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete cascade, item_id uuid references items(id), description text, qty numeric(14,2) default 1, rate numeric(14,2) default 0, gst_rate numeric(5,2) default 18, amount numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table bank_accounts (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  bank_name text not null, account_name text, account_number text, ifsc text, opening_balance numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table payments (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  customer_id uuid references customers(id), bank_account_id uuid references bank_accounts(id), payment_date date default current_date,
  amount_received numeric(14,2) default 0, tds_amount numeric(14,2) default 0, reference_no text,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table payment_allocations (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  payment_id uuid references payments(id) on delete cascade, invoice_id uuid references invoices(id), amount_allocated numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table expenses (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  expense_date date default current_date, vendor_id uuid references vendors(id), category text, amount numeric(14,2) default 0, gst_amount numeric(14,2) default 0, tds_amount numeric(14,2) default 0, payment_mode text, attachment_url text,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table bills (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  vendor_id uuid references vendors(id), bill_no text, bill_date date default current_date, due_date date, taxable_amount numeric(14,2) default 0, gst_amount numeric(14,2) default 0, total_amount numeric(14,2) default 0, payment_status text default 'unpaid',
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table bill_items (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  bill_id uuid references bills(id) on delete cascade, item_id uuid references items(id), description text, qty numeric(14,2) default 1, rate numeric(14,2) default 0, gst_rate numeric(5,2) default 18, amount numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table journal_entries (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  entry_date date default current_date, source_type text, source_id uuid, narration text,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table journal_lines (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  journal_entry_id uuid references journal_entries(id) on delete cascade, account_id uuid references accounts(id), debit numeric(14,2) default 0, credit numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table credit_notes (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  invoice_id uuid references invoices(id), credit_note_no text, credit_note_date date default current_date, amount numeric(14,2) default 0, gst_adjustment numeric(14,2) default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table attachments (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  source_type text, source_id uuid, file_url text, file_name text,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table audit_logs (
  id uuid primary key default uuid_generate_v4(), company_id uuid references companies(id) on delete cascade,
  table_name text, record_id uuid, action text, old_data jsonb, new_data jsonb,
  created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);

create or replace function is_company_member(cid uuid) returns boolean language sql stable security definer as $$
  select exists(select 1 from company_users cu where cu.company_id = cid and cu.user_id = auth.uid())
$$;

alter table companies enable row level security;
create policy "company members can read companies" on companies for select using (is_company_member(id));
create policy "authenticated can create companies" on companies for insert with check (auth.uid() = created_by);
create policy "company members can update companies" on companies for update using (is_company_member(id));

alter table company_users enable row level security;
create policy "members read company users" on company_users for select using (is_company_member(company_id));
create policy "owner creates company user" on company_users for insert with check (auth.uid() = created_by or user_id = auth.uid());

-- Apply standard company_id RLS to all business tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','vendors','items','accounts','invoices','invoice_items','bank_accounts','payments','payment_allocations','expenses','bills','bill_items','journal_entries','journal_lines','credit_notes','attachments','audit_logs'] LOOP
    EXECUTE format('alter table %I enable row level security', t);
    EXECUTE format('create policy "%I company read" on %I for select using (is_company_member(company_id))', t, t);
    EXECUTE format('create policy "%I company insert" on %I for insert with check (is_company_member(company_id))', t, t);
    EXECUTE format('create policy "%I company update" on %I for update using (is_company_member(company_id))', t, t);
    EXECUTE format('create policy "%I company delete" on %I for delete using (is_company_member(company_id))', t, t);
  END LOOP;
END $$;
