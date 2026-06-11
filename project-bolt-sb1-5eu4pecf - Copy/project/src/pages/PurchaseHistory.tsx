import { useEffect, useState, useCallback } from 'react';
import { History, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/codeGenerator';
import { Purchase, PurchaseItem } from '../types';

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierSearch, setSupplierSearch] = useState('');
  const [viewPurchase, setViewPurchase] = useState<(Purchase & { purchase_items: PurchaseItem[] }) | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('purchases').select('*')
      .gte('purchase_date', dateFrom)
      .lte('purchase_date', dateTo + 'T23:59:59')
      .order('purchase_date', { ascending: false });
    if (supplierSearch) q = q.ilike('supplier_name', `%${supplierSearch}%`);
    const { data } = await q;
    setPurchases(data ?? []);
    setLoading(false);
  }, [dateFrom, dateTo, supplierSearch]);

  useEffect(() => { load(); }, [load]);

  const viewDetails = async (p: Purchase) => {
    const { data } = await supabase.from('purchase_items').select('*').eq('purchase_id', p.id);
    setViewPurchase({ ...p, purchase_items: data ?? [] });
  };

  const totalPurchases = purchases.reduce((s, r) => s + Number(r.grand_total), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History size={20} className="text-blue-600" /> Purchase History
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Supplier</label>
            <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} placeholder="Filter by supplier..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Total GRNs', value: purchases.length.toString() },
          { label: 'Total Purchase Value', value: `₹${formatCurrency(totalPurchases)}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Purchase No', 'Date', 'Supplier', 'Invoice No', 'Invoice Date', 'Grand Total', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No purchases found</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{p.purchase_no}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.invoice_no || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(p.invoice_date)}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">₹{formatCurrency(p.grand_total)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewDetails(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewPurchase && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">Purchase: {viewPurchase.purchase_no}</h3>
              <button onClick={() => setViewPurchase(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p><strong>Purchase No:</strong> {viewPurchase.purchase_no}</p>
                  <p><strong>Date:</strong> {new Date(viewPurchase.purchase_date).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p><strong>Supplier:</strong> {viewPurchase.supplier_name}</p>
                  {viewPurchase.invoice_no && <p><strong>Invoice No:</strong> {viewPurchase.invoice_no}</p>}
                  {viewPurchase.invoice_date && <p><strong>Invoice Date:</strong> {formatDate(viewPurchase.invoice_date)}</p>}
                </div>
              </div>

              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden mb-4">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    {['#', 'Medicine', 'Type', 'Batch', 'Mfg', 'Expiry', 'Qty', 'Free', 'P.Price', 'Amount'].map(h => (
                      <th key={h} className="text-left px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewPurchase.purchase_items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{item.medicine_name}</td>
                      <td className="px-3 py-2">{item.type || '-'}</td>
                      <td className="px-3 py-2">{item.batch_no || '-'}</td>
                      <td className="px-3 py-2">{formatDate(item.mfg_date)}</td>
                      <td className="px-3 py-2">{formatDate(item.expiry_date)}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.free_qty}</td>
                      <td className="px-3 py-2">₹{item.purchase_price.toFixed(2)}</td>
                      <td className="px-3 py-2 font-bold text-blue-700">₹{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="space-y-1 text-sm w-48">
                  <div className="flex justify-between font-bold text-blue-700 border-t pt-1">
                    <span>Grand Total:</span><span>₹{formatCurrency(viewPurchase.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
