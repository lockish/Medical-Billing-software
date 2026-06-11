import { useState } from 'react';
import { RotateCcw, Search, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBillNo, formatCurrency, formatDate } from '../lib/codeGenerator';
import { Sale, SaleItem } from '../types';

export default function SalesReturn() {
  const [billSearch, setBillSearch] = useState('');
  const [foundBill, setFoundBill] = useState<(Sale & { sale_items: SaleItem[] }) | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [returnItems, setReturnItems] = useState<(SaleItem & { return_qty: number; selected: boolean })[]>([]);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const searchBill = async () => {
    if (!billSearch.trim()) return;
    setSearching(true); setNotFound(false); setFoundBill(null);
    const { data } = await supabase.from('sales').select('*').eq('bill_no', billSearch.trim()).eq('is_return', false).maybeSingle();
    if (!data) { setNotFound(true); setSearching(false); return; }
    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', data.id);
    setFoundBill({ ...data, sale_items: items ?? [] });
    setReturnItems((items ?? []).map(i => ({ ...i, return_qty: 0, selected: false })));
    setSearching(false);
  };

  const toggleItem = (idx: number) => {
    setReturnItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected, return_qty: !item.selected ? item.quantity : 0 } : item
    ));
  };

  const updateReturnQty = (idx: number, qty: number) => {
    setReturnItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, return_qty: Math.min(qty, item.quantity) } : item
    ));
  };

  const selectedItems = returnItems.filter(i => i.selected && i.return_qty > 0);
  const returnTotal = selectedItems.reduce((s, i) => s + i.rate_per_unit * i.return_qty * (1 - i.discount_pct / 100), 0);

  const processReturn = async () => {
    if (!foundBill || selectedItems.length === 0) return;
    setProcessing(true); setError('');
    const returnBillNo = await generateBillNo();
    const salePayload = {
      bill_no: returnBillNo,
      bill_date: new Date().toISOString(),
      customer_id: foundBill.customer_id,
      customer_name: foundBill.customer_name,
      customer_mobile: foundBill.customer_mobile,
      customer_address: foundBill.customer_address,
      customer_code: foundBill.customer_code,
      doctor_id: foundBill.doctor_id,
      doctor_name: foundBill.doctor_name,
      sales_rep: foundBill.sales_rep,
      delivery_type: foundBill.delivery_type,
      subtotal: returnTotal,
      total_discount: 0,
      sgst: 0, cgst: 0, cess: 0,
      grand_total: returnTotal,
      is_return: true,
      return_ref: foundBill.bill_no,
    };

    const { data: returnSale, error: saleErr } = await supabase.from('sales').insert(salePayload).select().maybeSingle();
    if (saleErr || !returnSale) { setError('Failed to create return bill'); setProcessing(false); return; }

    const returnItemsPayload = selectedItems.map(item => ({
      sale_id: returnSale.id,
      medicine_id: item.medicine_id,
      product_code: item.product_code,
      medicine_name: item.medicine_name,
      schedule: item.schedule,
      batch_no: item.batch_no,
      expiry_date: item.expiry_date,
      quantity: item.return_qty,
      free_qty: 0,
      rate_per_unit: item.rate_per_unit,
      discount_pct: item.discount_pct,
      discount_amt: item.rate_per_unit * item.return_qty * item.discount_pct / 100,
      amount: item.rate_per_unit * item.return_qty * (1 - item.discount_pct / 100),
    }));

    await supabase.from('sale_items').insert(returnItemsPayload);

    // Restore stock
    for (const item of selectedItems) {
      if (item.medicine_id) {
        await supabase.rpc('increment_stock', { med_id: item.medicine_id, qty: item.return_qty });
      }
    }

    setProcessing(false);
    setSuccess(`Return processed! Credit Note: ${returnBillNo} | Amount: ₹${formatCurrency(returnTotal)}`);
    setFoundBill(null);
    setReturnItems([]);
    setBillSearch('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <RotateCcw size={20} className="text-blue-600" /> Sales Return
        </h2>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-emerald-700">
          <Check size={18} />
          <span className="text-sm font-medium">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-emerald-500 hover:text-emerald-700"><X size={16} /></button>
        </div>
      )}

      {/* Bill Search */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Search Original Bill</h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={billSearch}
              onChange={e => { setBillSearch(e.target.value); setNotFound(false); }}
              onKeyDown={e => e.key === 'Enter' && searchBill()}
              placeholder="Enter Bill No (e.g. BILL-20260608-0001)..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={searchBill} disabled={searching}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {notFound && (
          <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle size={14} /> Bill not found. Please check the bill number.
          </div>
        )}
      </div>

      {/* Bill Details */}
      {foundBill && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Original Bill: {foundBill.bill_no}</h3>
              <div className="text-sm text-slate-500">
                {new Date(foundBill.bill_date).toLocaleDateString('en-IN')} · {foundBill.customer_name || 'Walk-in'} · ₹{formatCurrency(foundBill.grand_total)}
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3">Select items to return and specify return quantity:</p>

            <div className="space-y-2">
              {returnItems.map((item, idx) => (
                <div key={idx} className={`border rounded-xl p-3 transition-colors ${item.selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={item.selected} onChange={() => toggleItem(idx)}
                      className="w-4 h-4 accent-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.medicine_name}</p>
                      <p className="text-xs text-slate-400">
                        {item.product_code} · Rate: ₹{item.rate_per_unit.toFixed(2)} · Sold Qty: {item.quantity} · Batch: {item.batch_no || '-'} · Exp: {formatDate(item.expiry_date)}
                      </p>
                    </div>
                    {item.selected && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-semibold">Return Qty:</label>
                        <input type="number" min="0.01" step="0.01" max={item.quantity} value={item.return_qty}
                          onChange={e => updateReturnQty(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="text-xs text-blue-700 font-medium">
                          ₹{formatCurrency(item.rate_per_unit * item.return_qty * (1 - item.discount_pct / 100))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{selectedItems.length} item(s) selected for return</p>
                  <p className="text-xl font-bold text-blue-700 mt-1">Return Amount: ₹{formatCurrency(returnTotal)}</p>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Return Reason (optional)</label>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Wrong medicine, expired, etc." />
              </div>
              {error && <div className="text-red-600 text-sm flex items-center gap-1 mb-2"><AlertTriangle size={14} />{error}</div>}
              <button onClick={processReturn} disabled={processing}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                <RotateCcw size={16} /> {processing ? 'Processing...' : 'Process Return & Generate Credit Note'}
              </button>
            </div>
          )}
        </div>
      )}

      {!foundBill && !success && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <RotateCcw size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Enter a bill number above to process a return</p>
        </div>
      )}
    </div>
  );
}
