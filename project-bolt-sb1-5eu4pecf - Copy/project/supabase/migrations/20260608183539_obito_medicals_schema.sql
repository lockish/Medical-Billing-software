/*
# Obito Medicals POS - Full Schema

## Summary
Creates all tables for a pharmacy billing system: medicines, customers, doctors,
suppliers, sales bills, sale items, purchases, and purchase items.
Single-tenant app (no auth required), all tables accessible to anon + authenticated.

## Tables
1. medicines - Medicine master with pack size, pricing, stock, schedule info
2. customers - Customer master with auto-generated codes
3. doctors - Doctor master with auto-generated codes
4. suppliers - Supplier master with auto-generated codes
5. sales - Bill/invoice headers
6. sale_items - Line items for each bill
7. purchases - Purchase/GRN headers
8. purchase_items - Line items for each purchase

## Auto-code Generation
- Medicines: MED0001, MED0002...
- Customers: CUS0001, CUS0002...
- Doctors: DOC0001, DOC0002...
- Suppliers: SUP0001, SUP0002...
- Bills: BILL-YYYYMMDD-0001...
- Purchases: PUR-YYYYMMDD-0001...

## Security
- RLS enabled on all tables
- anon + authenticated can perform full CRUD (single-tenant POS)
*/

-- MEDICINES TABLE
CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text UNIQUE NOT NULL,
  medicine_name text NOT NULL,
  generic_name text,
  type text NOT NULL CHECK (type IN ('Tablet','Syrup','Powder','Capsule','Injection','Gel','Ointment','Cream')),
  hsn_code text,
  schedule text NOT NULL CHECK (schedule IN ('S','H','H1','H2','H3','Narcotic')),
  pack_size text NOT NULL,
  pack_size_qty numeric NOT NULL DEFAULT 1,
  mrp numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  batch_no text,
  mfg_date date,
  expiry_date date,
  current_stock numeric NOT NULL DEFAULT 0,
  rack_location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE NOT NULL,
  name text NOT NULL,
  mobile_no text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  mobile_no text,
  created_at timestamptz DEFAULT now()
);

-- SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text UNIQUE NOT NULL,
  supplier_name text NOT NULL,
  address text,
  phone_number text,
  gstin text,
  created_at timestamptz DEFAULT now()
);

-- SALES TABLE
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no text UNIQUE NOT NULL,
  bill_date timestamptz DEFAULT now(),
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  customer_mobile text,
  customer_address text,
  customer_code text,
  doctor_id uuid REFERENCES doctors(id),
  doctor_name text,
  doctor_address text,
  sales_rep text,
  delivery_type text DEFAULT 'store' CHECK (delivery_type IN ('store','delivery')),
  subtotal numeric NOT NULL DEFAULT 0,
  total_discount numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  cess numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  is_return boolean DEFAULT false,
  return_ref text,
  created_at timestamptz DEFAULT now()
);

-- SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id),
  product_code text,
  medicine_name text NOT NULL,
  schedule text,
  batch_no text,
  expiry_date date,
  quantity numeric NOT NULL DEFAULT 0,
  free_qty numeric DEFAULT 0,
  rate_per_unit numeric NOT NULL DEFAULT 0,
  discount_pct numeric DEFAULT 0,
  discount_amt numeric DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- PURCHASES TABLE
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_no text UNIQUE NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  invoice_no text,
  invoice_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  total_discount numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  medicine_id uuid REFERENCES medicines(id),
  product_code text,
  medicine_name text NOT NULL,
  type text,
  batch_no text,
  mfg_date date,
  expiry_date date,
  quantity numeric NOT NULL DEFAULT 0,
  free_qty numeric DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(medicine_name);
CREATE INDEX IF NOT EXISTS idx_medicines_code ON medicines(product_code);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_no);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

-- RLS SETUP (single-tenant: anon + authenticated full access)
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- MEDICINES POLICIES
DROP POLICY IF EXISTS "medicines_select" ON medicines;
CREATE POLICY "medicines_select" ON medicines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "medicines_insert" ON medicines;
CREATE POLICY "medicines_insert" ON medicines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "medicines_update" ON medicines;
CREATE POLICY "medicines_update" ON medicines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "medicines_delete" ON medicines;
CREATE POLICY "medicines_delete" ON medicines FOR DELETE TO anon, authenticated USING (true);

-- CUSTOMERS POLICIES
DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE TO anon, authenticated USING (true);

-- DOCTORS POLICIES
DROP POLICY IF EXISTS "doctors_select" ON doctors;
CREATE POLICY "doctors_select" ON doctors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "doctors_insert" ON doctors;
CREATE POLICY "doctors_insert" ON doctors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "doctors_update" ON doctors;
CREATE POLICY "doctors_update" ON doctors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "doctors_delete" ON doctors;
CREATE POLICY "doctors_delete" ON doctors FOR DELETE TO anon, authenticated USING (true);

-- SUPPLIERS POLICIES
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO anon, authenticated USING (true);

-- SALES POLICIES
DROP POLICY IF EXISTS "sales_select" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sales_insert" ON sales;
CREATE POLICY "sales_insert" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sales_update" ON sales;
CREATE POLICY "sales_update" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sales_delete" ON sales;
CREATE POLICY "sales_delete" ON sales FOR DELETE TO anon, authenticated USING (true);

-- SALE ITEMS POLICIES
DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sale_items_update" ON sale_items;
CREATE POLICY "sale_items_update" ON sale_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sale_items_delete" ON sale_items;
CREATE POLICY "sale_items_delete" ON sale_items FOR DELETE TO anon, authenticated USING (true);

-- PURCHASES POLICIES
DROP POLICY IF EXISTS "purchases_select" ON purchases;
CREATE POLICY "purchases_select" ON purchases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "purchases_insert" ON purchases;
CREATE POLICY "purchases_insert" ON purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "purchases_update" ON purchases;
CREATE POLICY "purchases_update" ON purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "purchases_delete" ON purchases;
CREATE POLICY "purchases_delete" ON purchases FOR DELETE TO anon, authenticated USING (true);

-- PURCHASE ITEMS POLICIES
DROP POLICY IF EXISTS "purchase_items_select" ON purchase_items;
CREATE POLICY "purchase_items_select" ON purchase_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "purchase_items_insert" ON purchase_items;
CREATE POLICY "purchase_items_insert" ON purchase_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_items_update" ON purchase_items;
CREATE POLICY "purchase_items_update" ON purchase_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_items_delete" ON purchase_items;
CREATE POLICY "purchase_items_delete" ON purchase_items FOR DELETE TO anon, authenticated USING (true);
