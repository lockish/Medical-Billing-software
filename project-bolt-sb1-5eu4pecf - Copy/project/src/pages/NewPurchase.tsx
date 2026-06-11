import { useState, useRef, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Trash2, Save, X, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generatePurchaseNo, generateSupplierCode, formatCurrency } from '../lib/codeGenerator';
import { Supplier, Medicine, PurchaseItem } from '../types';

interface PurchaseRow extends PurchaseItem {
  _medicine?: Medicine;
}

const emptyRow = (): PurchaseRow => ({
  medicine_name: '', type: '', batch_no: '', mfg_date: '', expiry_date: '',
  quantity: 1, free_qty: 0, purchase_price: 0, amount: 0,
});

export default function NewPurchase() {
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [showSupDrop, setShowSupDrop] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const supRef = useRef<HTMLInputElement>(null);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseRow[]>([emptyRow()]);

  // Medicine search per row
  const [medSearch, setMedSearch] = useState<string[]>(['']);
  const [medResults, setMedResults] = useState<Medicine[][]>([[]]);
  const [showMedDrop, setShowMedDrop] = useState<boolean[]>([false]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New supplier
  const [showNewSup, setShowNewSup] = useState(false);
  const [newSupForm, setNewSupForm] = useState({ supplier_name: '', phone_number: '', address: '', gstin: '' });
  const [savingSup, setSavingSup] = useState(false);

  const searchSuppliers = useCallback(async (q: string) => {
    if (!q.trim()) { setSupplierResults([]); return; }
    const { data } = await supabase.from('suppliers').select('*').ilike('supplier_name', `%${q}%`).limit(6);
    setSupplierResults(data ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchSuppliers(supplierSearch), 200);
    return () => clearTimeout(t);
  }, [supplierSearch, searchSuppliers]);

  const searchMedForRow = async (q: string, idx: number) => {
    if (!q.trim()) { setMedResults(prev => { const n = [...prev]; n[idx] = []; return n; }); return; }
    const { data } = await supabase.from('medicines').select('*').ilike('medicine_name', `%${q}%`).limit(6);
    setMedResults(prev => { const n = [...prev]; n[idx] = data ?? []; return n; });
  };

  const setRowMedSearch = (idx: number, val: string) => {
    setMedSearch(prev => { const n = [...prev]; n[idx] = val; return n; });
    setShowMedDrop(prev => { const n = [...prev]; n[idx] = true; return n; });
    const t = setTimeout(() => searchMedForRow(val, idx), 200);
    return () => clearTimeout(t);
  };

  const selectMedForRow = (idx: number, m: Medicine) => {
    setItems(prev => prev.map((row, i) => i === idx ? {
      ...row,
      medicine_id: m.id,
      product_code: m.product_code,
      medicine_name: m.medicine_name,
      type: m.type,
      batch_no: m.batch_no ?? '',
      mfg_date: m.mfg_date ?? '',
      expiry_date: m.expiry_date ?? '',
      purchase_price: m.purchase_price,
      amount: m.purchase_price * row.quantity,
      _medicine: m,
    } : row));
    setMedSearch(prev => { const n = [...prev]; n[idx] = m.medicine_name; return n; });
    setShowMedDrop(prev => { const n = [...prev]; n[idx] = false; return n; });
  };

  const updateRow = (idx: number, field: keyof PurchaseRow, value: string | number) => {
    setItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      updated.amount = (updated.purchase_price || 0) * (updated.quantity || 0);
      return updated;
    }));
  };

  const addRow = () => {
    setItems(prev => [...prev, emptyRow()]);
    setMedSearch(prev => [...prev, '']);
    setMedResults(prev => [...prev, []]);
    setShowMedDrop(prev => [...prev, false]);
  };

  const removeRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setMedSearch(prev => prev.filter((_, i) => i !== idx));
    setMedResults(prev => prev.filter((_, i) => i !== idx));
    setShowMedDrop(prev => prev.filter((_, i) => i !== idx));
  };

  const createSupplier = async () => {
    if (!newSupForm.supplier_name) return;
    setSavingSup(true);
    const code = await generateSupplierCode();
    const { data } = await supabase.from('suppliers').insert({ ...newSupForm, supplier_code: code }).select().maybeSingle();
    setSavingSup(false);
    if (data) {
      setSelectedSupplier(data);
      setSupplierSearch(data.supplier_name);
      setShowNewSup(false);
    }
  };

  const grandTotal = items.reduce((s, i) => s + (i.amount || 0), 0);

  const save = async () => {
    if (!selectedSupplier) { setError('Please select a supplier'); return; }
    const validItems = items.filter(i => i.medicine_name && i.quantity > 0);
    if (validItems.length === 0) { setError('Add at least one medicine'); return; }

    setSaving(true); setError('');
    const purchaseNo = await generatePurchaseNo();
    const purchasePayload = {
      purchase_no: purchaseNo,
      purchase_date: new Date().toISOString(),
      supplier_id: selectedSupplier.id,
      supplier_name: selectedSupplier.supplier_name,
      invoice_no: invoiceNo || null,
      invoice_date: invoiceDate || null,
      subtotal: grandTotal,
      total_discount: 0,
      sgst: 0, cgst: 0,
      grand_total: grandTotal,
    };

    const { data: purchaseData, error: pErr } = await supabase.from('purchases').insert(purchasePayload).select().maybeSingle();
    if (pErr || !purchaseData) { setError('Error saving purchase'); setSaving(false); return; }

    const purchaseItems = validItems.map(item => ({
      purchase_id: purchaseData.id,
      medicine_id: item.medicine_id ?? null,
      product_code: item.product_code ?? null,
      medicine_name: item.medicine_name,
      type: item.type ?? null,
      batch_no: item.batch_no ?? null,
      mfg_date: item.mfg_date || null,
      expiry_date: item.expiry_date || null,
      quantity: item.quantity,
      free_qty: item.free_qty,
      purchase_price: item.purchase_price,
      amount: item.amount,
    }));

    await supabase.from('purchase_items').insert(purchaseItems);

    // Update stock
    for (const item of validItems) {
      if (item.medicine_id) {
        const totalQty = item.quantity + item.free_qty;
        await supabase.rpc('increment_stock', { med_id: item.medicine_id, qty: totalQty });
        // Also update batch/expiry/purchase price
        await supabase.from('medicines').update({
          batch_no: item.batch_no || undefined,
          mfg_date: item.mfg_date || undefined,
          expiry_date: item.expiry_date || undefined,
          purchase_price: item.purchase_price,
          updated_at: new Date().toISOString(),
        }).eq('id', item.medicine_id);
      }
    }

    setSaving(false);
    setSuccess(`Purchase saved! GRN: ${purchaseNo} | Total: ₹${formatCurrency(grandTotal)}`);
    setItems([emptyRow()]);
    setMedSearch(['']);
    setMedResults([[]]);
    setShowMedDrop([false]);
    setSelectedSupplier(null);
    setSupplierSearch('');
    setInvoiceNo('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ShoppingBag size={20} className="text-blue-600" /> New Purchase / GRN
        </h2>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-emerald-700">
          <Check size={18} /><span className="text-sm font-medium">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-red-700">
          <AlertTriangle size={18} /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Supplier + Invoice Details */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Supplier *</label>
            <div className="relative" ref={supRef}>
              <input
                value={supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); setShowSupDrop(true); if (!e.target.value) setSelectedSupplier(null); }}
                onFocus={() => setShowSupDrop(true)}
                onBlur={() => setTimeout(() => setShowSupDrop(false), 200)}
                placeholder="Search supplier..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showSupDrop && (supplierResults.length > 0 || supplierSearch) && (
                <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1">
                  {supplierResults.map(s => (
                    <button key={s.id} onMouseDown={() => { setSelectedSupplier(s); setSupplierSearch(s.supplier_name); setShowSupDrop(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-50 text-sm">
                      <p className="font-medium">{s.supplier_name}</p>
                      <p className="text-xs text-slate-400">{s.supplier_code} · {s.phone_number}</p>
                    </button>
                  ))}
                  <button onMouseDown={() => { setShowSupDrop(false); setShowNewSup(true); setNewSupForm({ supplier_name: supplierSearch, phone_number: '', address: '', gstin: '' }); }}
                    className="w-full text-left px-4 py-2.5 text-blue-600 font-medium text-sm hover:bg-blue-50 flex items-center gap-2 border-t border-slate-100">
                    <Plus size={14} /> Add New Supplier
                  </button>
                </div>
              )}
            </div>
            {selectedSupplier && (
              <p className="text-xs text-slate-400 mt-1">{selectedSupplier.supplier_code} · {selectedSupplier.phone_number}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Invoice No</label>
            <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Supplier invoice no." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Invoice Date</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Purchase Items</h3>
          <button onClick={addRow} className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:bg-blue-50 px-2 py-1 rounded-lg">
            <Plus size={14} /> Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Medicine', 'Type', 'Batch', 'Mfg Date', 'Expiry', 'Qty', 'Free Qty', 'Purchase Price', 'Amount', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="px-3 py-2 min-w-48">
                    <div className="relative">
                      <input
                        value={medSearch[idx] ?? ''}
                        onChange={e => setRowMedSearch(idx, e.target.value)}
                        onFocus={() => setShowMedDrop(prev => { const n = [...prev]; n[idx] = true; return n; })}
                        onBlur={() => setTimeout(() => setShowMedDrop(prev => { const n = [...prev]; n[idx] = false; return n; }), 200)}
                        placeholder="Search medicine..."
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showMedDrop[idx] && (medResults[idx] ?? []).length > 0 && (
                        <div className="absolute top-full left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 min-w-64">
                          {(medResults[idx] ?? []).map(m => (
                            <button key={m.id} onMouseDown={() => selectMedForRow(idx, m)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 text-xs">
                              <p className="font-medium">{m.medicine_name}</p>
                              <p className="text-slate-400">{m.product_code} · {m.type}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input value={row.type ?? ''} onChange={e => updateRow(idx, 'type', e.target.value)}
                      className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={row.batch_no ?? ''} onChange={e => updateRow(idx, 'batch_no', e.target.value)}
                      className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={row.mfg_date ?? ''} onChange={e => updateRow(idx, 'mfg_date', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={row.expiry_date ?? ''} onChange={e => updateRow(idx, 'expiry_date', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="1" value={row.quantity} onChange={e => updateRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" value={row.free_qty} onChange={e => updateRow(idx, 'free_qty', parseFloat(e.target.value) || 0)}
                      className="w-16 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.01" value={row.purchase_price} onChange={e => updateRow(idx, 'purchase_price', parseFloat(e.target.value) || 0)}
                      className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2 font-semibold text-blue-700 text-sm">₹{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-2">
                    {items.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <button onClick={addRow} className="flex items-center gap-1.5 text-blue-600 text-sm hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
            <Plus size={14} /> Add Row
          </button>
          <div className="text-right">
            <span className="text-sm text-slate-500">Grand Total: </span>
            <span className="text-xl font-bold text-blue-700">₹{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm">
        <Save size={16} /> {saving ? 'Saving...' : 'Save Purchase & Update Stock'}
      </button>

      {/* New Supplier Modal */}
      {showNewSup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">New Supplier</h3>
              <button onClick={() => setShowNewSup(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Supplier Name *</label>
                <input value={newSupForm.supplier_name} onChange={e => setNewSupForm(p => ({ ...p, supplier_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                <input value={newSupForm.phone_number} onChange={e => setNewSupForm(p => ({ ...p, phone_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">GSTIN</label>
                <input value={newSupForm.gstin} onChange={e => setNewSupForm(p => ({ ...p, gstin: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowNewSup(false)} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm text-slate-600">Cancel</button>
              <button onClick={createSupplier} disabled={savingSup} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {savingSup ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
