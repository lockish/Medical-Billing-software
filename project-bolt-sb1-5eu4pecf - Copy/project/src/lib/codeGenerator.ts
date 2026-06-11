import { supabase } from './supabase';

export async function generateProductCode(): Promise<string> {
  const { count } = await supabase.from('medicines').select('*', { count: 'exact', head: true });
  const num = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `MED${num}`;
}

export async function generateCustomerCode(): Promise<string> {
  const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
  const num = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `CUS${num}`;
}

export async function generateDoctorCode(): Promise<string> {
  const { count } = await supabase.from('doctors').select('*', { count: 'exact', head: true });
  const num = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `DOC${num}`;
}

export async function generateSupplierCode(): Promise<string> {
  const { count } = await supabase.from('suppliers').select('*', { count: 'exact', head: true });
  const num = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `SUP${num}`;
}

export async function generateBillNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .gte('bill_date', today.toISOString().slice(0, 10))
    .lt('bill_date', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
  const num = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `BILL-${dateStr}-${num}`;
}

export async function generatePurchaseNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .gte('purchase_date', today.toISOString().slice(0, 10))
    .lt('purchase_date', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
  const num = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `PUR-${dateStr}-${num}`;
}

export function extractPackQty(packSize: string): number {
  const match = packSize.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN');
}
