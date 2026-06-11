import { useEffect, useState, useCallback, useRef } from 'react';
import { History, Eye, Printer, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/codeGenerator';
import { Sale, SaleItem } from '../types';
import InvoicePrint from '../components/InvoicePrint';

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [custSearch, setCustSearch] = useState('');
  const [repSearch, setRepSearch] = useState('');
  const [viewSale, setViewSale] = useState<(Sale & { sale_items: SaleItem[] }) | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('sales').select('*')
      .gte('bill_date', dateFrom)
      .lte('bill_date', dateTo + 'T23:59:59')
      .eq('is_return', false)
      .order('bill_date', { ascending: false });
    if (custSearch) q = q.ilike('customer_name', `%${custSearch}%`);
    if (repSearch) q = q.ilike('sales_rep', `%${repSearch}%`);
    const { data } = await q;
    setSales(data ?? []);
    setLoading(false);
  }, [dateFrom, dateTo, custSearch, repSearch]);

  useEffect(() => { load(); }, [load]);

  const viewDetails = async (sale: Sale) => {
    const { data } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
    setViewSale({ ...sale, sale_items: data ?? [] });
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content || !viewSale) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`<html><head><title>Invoice - ${viewSale.bill_no}</title>
      <style>body{margin:0;padding:0;font-family:Arial,sans-serif;}</style>
      </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const totalSales = sales.reduce((s, r) => s + Number(r.grand_total), 0);
  const totalDisc = sales.reduce((s, r) => s + Number(r.total_discount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History size={20} className="text-blue-600" /> Sales History
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <label className="block text-xs font-semibold text-slate-500 mb-1">Customer</label>
            <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Filter by customer..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sales Rep</label>
            <input value={repSearch} onChange={e => setRepSearch(e.target.value)} placeholder="Filter by rep..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Bills', value: sales.length.toString() },
          { label: 'Total Sales', value: `₹${formatCurrency(totalSales)}` },
          { label: 'Total Discount', value: `₹${formatCurrency(totalDisc)}` },
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
                {['Bill No', 'Date & Time', 'Customer', 'Doctor', 'Sales Rep', 'Type', 'Grand Total', 'Discount', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">No bills found for selected filters</td></tr>
              ) : sales.map(sale => (
                <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{sale.bill_no}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{new Date(sale.bill_date).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800 font-medium">{sale.customer_name || 'Walk-in'}</p>
                    {sale.customer_mobile && <p className="text-xs text-slate-400">{sale.customer_mobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{sale.doctor_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{sale.sales_rep || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sale.delivery_type === 'delivery' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {sale.delivery_type === 'delivery' ? 'Delivery' : 'Store'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-700">₹{formatCurrency(sale.grand_total)}</td>
                  <td className="px-4 py-3 text-red-600 text-sm">₹{formatCurrency(sale.total_discount)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewDetails(sale)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">Bill: {viewSale.bill_no}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setViewSale(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p><strong>Bill No:</strong> {viewSale.bill_no}</p>
                  <p><strong>Date:</strong> {new Date(viewSale.bill_date).toLocaleString('en-IN')}</p>
                  <p><strong>Type:</strong> {viewSale.delivery_type}</p>
                  {viewSale.sales_rep && <p><strong>Sales Rep:</strong> {viewSale.sales_rep}</p>}
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p><strong>Customer:</strong> {viewSale.customer_name || 'Walk-in'}</p>
                  {viewSale.customer_mobile && <p><strong>Mobile:</strong> {viewSale.customer_mobile}</p>}
                  {viewSale.doctor_name && <p><strong>Doctor:</strong> {viewSale.doctor_name}</p>}
                </div>
              </div>

              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden mb-4">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    {['#', 'Medicine', 'Batch', 'Qty', 'Rate', 'Disc%', 'Amount'].map(h => (
                      <th key={h} className="text-left px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewSale.sale_items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{item.medicine_name} <span className="text-blue-600">#{item.schedule}</span></td>
                      <td className="px-3 py-2">{item.batch_no || '-'}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">₹{item.rate_per_unit.toFixed(2)}</td>
                      <td className="px-3 py-2">{item.discount_pct}%</td>
                      <td className="px-3 py-2 font-bold text-blue-700">₹{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="space-y-1 text-sm w-48">
                  <div className="flex justify-between"><span>Subtotal:</span><span>₹{formatCurrency(viewSale.subtotal)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Discount:</span><span>- ₹{formatCurrency(viewSale.total_discount)}</span></div>
                  <div className="flex justify-between font-bold text-blue-700 border-t pt-1"><span>Grand Total:</span><span>₹{formatCurrency(viewSale.grand_total)}</span></div>
                </div>
              </div>
            </div>
          </div>
          <div ref={printRef} style={{ display: 'none' }}>
            <InvoicePrint sale={viewSale} />
          </div>
        </div>
      )}
    </div>
  );
}
