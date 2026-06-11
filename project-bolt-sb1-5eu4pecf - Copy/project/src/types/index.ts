export interface Medicine {
  id: string;
  product_code: string;
  medicine_name: string;
  generic_name?: string;
  type: 'Tablet' | 'Syrup' | 'Powder' | 'Capsule' | 'Injection' | 'Gel' | 'Ointment' | 'Cream';
  hsn_code?: string;
  schedule: 'S' | 'H' | 'H1' | 'H2' | 'H3' | 'Narcotic';
  pack_size: string;
  pack_size_qty: number;
  mrp: number;
  selling_price: number;
  purchase_price: number;
  batch_no?: string;
  mfg_date?: string;
  expiry_date?: string;
  current_stock: number;
  rack_location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  mobile_no: string;
  address?: string;
  created_at?: string;
}

export interface Doctor {
  id: string;
  doctor_code: string;
  name: string;
  address?: string;
  mobile_no?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  address?: string;
  phone_number?: string;
  gstin?: string;
  created_at?: string;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  medicine_id?: string;
  product_code?: string;
  medicine_name: string;
  schedule?: string;
  batch_no?: string;
  expiry_date?: string;
  quantity: number;
  free_qty: number;
  rate_per_unit: number;
  discount_pct: number;
  discount_amt: number;
  amount: number;
}

export interface Sale {
  id: string;
  bill_no: string;
  bill_date: string;
  customer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_address?: string;
  customer_code?: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor_address?: string;
  sales_rep?: string;
  delivery_type: 'store' | 'delivery';
  subtotal: number;
  total_discount: number;
  sgst: number;
  cgst: number;
  cess: number;
  grand_total: number;
  is_return: boolean;
  return_ref?: string;
  sale_items?: SaleItem[];
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  medicine_id?: string;
  product_code?: string;
  medicine_name: string;
  type?: string;
  batch_no?: string;
  mfg_date?: string;
  expiry_date?: string;
  quantity: number;
  free_qty: number;
  purchase_price: number;
  amount: number;
}

export interface Purchase {
  id: string;
  purchase_no: string;
  purchase_date: string;
  supplier_id?: string;
  supplier_name?: string;
  invoice_no?: string;
  invoice_date?: string;
  subtotal: number;
  total_discount: number;
  sgst: number;
  cgst: number;
  grand_total: number;
  purchase_items?: PurchaseItem[];
}

export type Page =
  | 'dashboard'
  | 'new-bill'
  | 'sales-return'
  | 'sales-history'
  | 'new-purchase'
  | 'purchase-history'
  | 'medicines'
  | 'customers'
  | 'doctors'
  | 'suppliers'
  | 'reports';
