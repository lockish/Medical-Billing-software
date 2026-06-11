import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Printer, Save, User, Stethoscope, X, Check, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBillNo, generateCustomerCode, formatCurrency, formatDate } from '../lib/codeGenerator';
import { Medicine, Customer, Doctor, SaleItem, Sale } from '../types';
import InvoicePrint from '../components/InvoicePrint';

interface MedSearch extends Medicine {
  rate_per_unit: number;
  margin_per_unit: number;
}

interface BillItem extends SaleItem {
  _medicine?: MedSearch;
}

const emptySelected = {
  medicine: null as MedSearch | null,
  qty: 1,
  freeQty: 0,
  discPct: 0,
};

export default function NewBill() {
  // Medicine search
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<MedSearch[]>([]);
  const [showMedDrop, setShowMedDrop] = useState(false);
  const medRef = useRef<HTMLInputElement>(null);

  // Selected medicine to add
  const [selected, setSelected] = useState(emptySelected);

  // Bill items
  const [items, setItems] = useState<BillItem[]>([]);

  // Customer
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const custRef = useRef<HTMLInputElement>(null);

  // Doctor
  const [docSearch, setDocSearch] = useState('');
  const [docResults, setDocResults] = useState<Doctor[]>([]);
  const [showDocDrop, setShowDocDrop] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const docRef = useRef<HTMLInputElement>(null);

  // Bill meta
  const [salesRep, setSalesRep] = useState('');
  const [deliveryType, setDeliveryType] = useState<'store' | 'delivery'>('store');
  const [globalDiscPct, setGlobalDiscPct] = useState(0);

  // New customer form
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', mobile_no: '', address: '' });
  const [savingCust, setSavingCust] = useState(false);

  // Save & print
  const [saving, setSaving] = useState(false);
  const [savedSale, setSavedSale] = useState<(Sale & { sale_items: SaleItem[] }) | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Medicine search
  const searchMedicines = useCallback(async (q: string) => {
    if (!q.trim()) { setMedResults([]); return; }
    const { data } = await supabase.from('medicines').select('*').ilike('medicine_name', `%${q}%`).limit(8);
    setMedResults((data ?? []).map(m => ({
      ...m,
      rate_per_unit: m.pack_size_qty > 0 ? m.selling_price / m.pack_size_qty : m.selling_price,
      margin_per_unit: m.pack_size_qty > 0 ? (m.selling_price - m.purchase_price) / m.pack_size_qty : 0,
    })));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchMedicines(medSearch), 200);
    return () => clearTimeout(t);
  }, [medSearch, searchMedicines]);

  // Customer search
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustResults([]); return; }
    const { data } = await supabase.from('customers').select('*')
      .or(`name.ilike.%${q}%,mobile_no.ilike.%${q}%`).limit(6);
    setCustResults(data ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(custSearch), 200);
    return () => clearTimeout(t);
  }, [custSearch, searchCustomers]);

  // Doctor search
  const searchDoctors = useCallback(async (q: string) => {
    if (!q.trim()) { setDocResults([]); return; }
    const { data } = await supabase.from('doctors').select('*').ilike('name', `%${q}%`).limit(6);
    setDocResults(data ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchDoctors(docSearch), 200);
    return () => clearTimeout(t);
  }, [docSearch, searchDoctors]);

  // Outside click closers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (medRef.current && !medRef.current.closest('.med-search-wrap')?.contains(e.target as Node)) setShowMedDrop(false);
      if (custRef.current && !custRef.current.closest('.cust-search-wrap')?.contains(e.target as Node)) setShowCustDrop(false);
      if (docRef.current && !docRef.current.closest('.doc-search-wrap')?.contains(e.target as Node)) setShowDocDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectMedicine = (m: MedSearch) => {
    setSelected({ medicine: m, qty: 1, freeQty: 0, discPct: 0 });
    setMedSearch('');
    setMedResults([]);
    setShowMedDrop(false);
  };

  const addToItems = () => {
    if (!selected.medicine) return;
    const m = selected.medicine;
    const rate = m.rate_per_unit;
    const grossAmt = rate * selected.qty;
    const discAmt = (grossAmt * selected.discPct) / 100;
    const amount = grossAmt - discAmt;
    const item: BillItem = {
      medicine_id: m.id,
      product_code: m.product_code,
      medicine_name: m.medicine_name,
      schedule: m.schedule,
      batch_no: m.batch_no ?? '',
      expiry_date: m.expiry_date ?? '',
      quantity: selected.qty,
      free_qty: selected.freeQty,
      rate_per_unit: rate,
      discount_pct: selected.discPct,
      discount_amt: discAmt,
      amount,
      _medicine: m,
    };
    setItems(prev => [...prev, item]);
    setSelected(emptySelected);
    setTimeout(() => medRef.current?.focus(), 50);
  };

  const updateItem = (idx: number, field: keyof BillItem, value: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      const gross = updated.rate_per_unit * updated.quantity;
      updated.discount_amt = (gross * updated.discount_pct) / 100;
      updated.amount = gross - updated.discount_amt;
      return updated;
    }));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Totals
  const subtotal = items.reduce((s, i) => s + i.rate_per_unit * i.quantity, 0);
  const itemDiscount = items.reduce((s, i) => s + i.discount_amt, 0);
  const afterItemDisc = subtotal - itemDiscount;
  const globalDiscAmt = (afterItemDisc * globalDiscPct) / 100;
  const totalDiscount = itemDiscount + globalDiscAmt;
  const taxable = afterItemDisc - globalDiscAmt;
  const grandTotal = taxable;

  const createNewCustomer = async () => {
    if (!newCustForm.name || !newCustForm.mobile_no) return;
    setSavingCust(true);
    const code = await generateCustomerCode();
    const { data } = await supabase.from('customers').insert({ ...newCustForm, customer_code: code }).select().maybeSingle();
    setSavingCust(false);
    if (data) {
      setSelectedCustomer(data);
      setCustSearch(data.name);
      setShowNewCust(false);
      setNewCustForm({ name: '', mobile_no: '', address: '' });
    }
  };

  const clearBill = () => {
    setItems([]);
    setSelected(emptySelected);
    setSelectedCustomer(null);
    setSelectedDoctor(null);
    setCustSearch('');
    setDocSearch('');
    setSalesRep('');
    setGlobalDiscPct(0);
    setDeliveryType('store');
    medRef.current?.focus();
  };

  const saveBill = async () => {
    if (items.length === 0) return;
    setSaving(true);
    const billNo = await generateBillNo();
    const salePayload = {
      bill_no: billNo,
      bill_date: new Date().toISOString(),
      customer_id: selectedCustomer?.id ?? null,
      customer_name: selectedCustomer?.name ?? null,
      customer_mobile: selectedCustomer?.mobile_no ?? null,
      customer_address: selectedCustomer?.address ?? null,
      customer_code: selectedCustomer?.customer_code ?? null,
      doctor_id: selectedDoctor?.id ?? null,
      doctor_name: selectedDoctor?.name ?? null,
      doctor_address: selectedDoctor?.address ?? null,
      sales_rep: salesRep || null,
      delivery_type: deliveryType,
      subtotal,
      total_discount: totalDiscount,
      sgst: 0,
      cgst: 0,
      cess: 0,
      grand_total: grandTotal,
      is_return: false,
    };

    const { data: saleData, error: saleErr } = await supabase.from('sales').insert(salePayload).select().maybeSingle();
    if (saleErr || !saleData) { setSaving(false); alert('Error saving bill: ' + (saleErr?.message ?? 'Unknown')); return; }

    const saleItems = items.map(item => ({
      sale_id: saleData.id,
      medicine_id: item.medicine_id,
      product_code: item.product_code,
      medicine_name: item.medicine_name,
      schedule: item.schedule,
      batch_no: item.batch_no,
      expiry_date: item.expiry_date || null,
      quantity: item.quantity,
      free_qty: item.free_qty,
      rate_per_unit: item.rate_per_unit,
      discount_pct: item.discount_pct,
      discount_amt: item.discount_amt,
      amount: item.amount,
    }));

    await supabase.from('sale_items').insert(saleItems);

    // Update stock
    for (const item of items) {
      if (item.medicine_id) {
        await supabase.rpc('decrement_stock', { med_id: item.medicine_id, qty: item.quantity });
      }
    }

    setSaving(false);
    setSavedSale({ ...saleData, sale_items: items });
    setShowPrintModal(true);
    clearBill();
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice - ${savedSale?.bill_no}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        @media print { @page { size: A4; margin: 0; } }
      </style></head>
      <body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left - Bill Builder */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Medicine Search */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Search size={16} className="text-blue-600" /> Search & Add Medicine
          </h3>
          <div className="med-search-wrap relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={medRef}
              value={medSearch}
              onChange={e => { setMedSearch(e.target.value); setShowMedDrop(true); }}
              onFocus={() => setShowMedDrop(true)}
              placeholder="Type medicine name to search..."
              className="w-full pl-9 pr-3 py-3 border-2 border-blue-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none transition-colors"
              autoFocus
            />
            {showMedDrop && medResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                {medResults.map(m => (
                  <button
                    key={m.id}
                    onMouseDown={() => selectMedicine(m)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{m.medicine_name}</p>
                        <p className="text-xs text-slate-400">{m.product_code} · {m.type} · <span className="font-semibold text-blue-600">#{m.schedule}</span> · {m.pack_size} · Batch: {m.batch_no || '-'} · Exp: {formatDate(m.expiry_date)}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-bold text-blue-700">₹{m.rate_per_unit.toFixed(2)}/unit</p>
                        <p className="text-xs text-slate-400">Stock: {m.current_stock}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected medicine row */}
          {selected.medicine && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{selected.medicine.medicine_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selected.medicine.product_code} · {selected.medicine.type} · <span className="text-blue-600 font-semibold">#{selected.medicine.schedule}</span> · {selected.medicine.pack_size} · Batch: {selected.medicine.batch_no || '-'} · Exp: {formatDate(selected.medicine.expiry_date)}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="text-blue-700 font-bold">Rate: ₹{selected.medicine.rate_per_unit.toFixed(2)}/unit</span>
                    <span className="text-slate-500 ml-3">Margin: ₹{selected.medicine.margin_per_unit.toFixed(2)}/unit</span>
                    <span className="text-slate-500 ml-3">Stock: {selected.medicine.current_stock}</span>
                  </p>
                </div>
                <button onClick={() => setSelected(emptySelected)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Qty *</label>
                  <input
                    type="number" min="0.01" step="0.01" value={selected.qty}
                    onChange={e => setSelected(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Free Qty</label>
                  <input type="number" min="0" value={selected.freeQty}
                    onChange={e => setSelected(p => ({ ...p, freeQty: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Disc %</label>
                  <input type="number" min="0" max="100" value={selected.discPct}
                    onChange={e => setSelected(p => ({ ...p, discPct: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="ml-auto">
                  <p className="text-xs text-slate-500 mb-1">Amount</p>
                  <p className="text-lg font-bold text-blue-700">
                    ₹{formatCurrency(selected.medicine.rate_per_unit * selected.qty * (1 - selected.discPct / 100))}
                  </p>
                </div>
                <button
                  onClick={addToItems}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bill Items Table */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-600" /> Bill Items ({items.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['#', 'Medicine', 'Batch/Exp', 'Rate/Unit', 'Qty', 'Free', 'Disc%', 'Disc Amt', 'Amount', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800 text-sm">{item.medicine_name}</p>
                        <p className="text-xs text-slate-400">{item.product_code} <span className="text-blue-600">#{item.schedule}</span></p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        <p>{item.batch_no || '-'}</p>
                        <p>{formatDate(item.expiry_date)}</p>
                      </td>
                      <td className="px-3 py-2 text-blue-700 font-medium">₹{item.rate_per_unit.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" value={item.free_qty}
                          onChange={e => updateItem(idx, 'free_qty', parseFloat(e.target.value) || 0)}
                          className="w-14 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" max="100" value={item.discount_pct}
                          onChange={e => updateItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                          className="w-14 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 text-red-600 text-sm">₹{formatCurrency(item.discount_amt)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">₹{formatCurrency(item.amount)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customer & Doctor */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <User size={12} /> Customer
            </label>
            <div className="cust-search-wrap relative">
              <input
                ref={custRef}
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); if (!e.target.value) setSelectedCustomer(null); }}
                onFocus={() => setShowCustDrop(true)}
                placeholder="Search by name or mobile..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showCustDrop && (custResults.length > 0 || custSearch) && (
                <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                  {custResults.map(c => (
                    <button key={c.id} onMouseDown={() => { setSelectedCustomer(c); setCustSearch(c.name); setShowCustDrop(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-50 text-sm">
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.customer_code} · {c.mobile_no}</p>
                    </button>
                  ))}
                  <button onMouseDown={() => { setShowCustDrop(false); setShowNewCust(true); setNewCustForm({ name: custSearch, mobile_no: '', address: '' }); }}
                    className="w-full text-left px-4 py-2.5 text-blue-600 font-medium text-sm hover:bg-blue-50 flex items-center gap-2 border-t border-slate-100">
                    <Plus size={14} /> Create New Customer
                  </button>
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="mt-1.5 text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span>{selectedCustomer.customer_code} · {selectedCustomer.mobile_no}</span>
                <button onClick={() => { setSelectedCustomer(null); setCustSearch(''); }} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Stethoscope size={12} /> Doctor (optional)
            </label>
            <div className="doc-search-wrap relative">
              <input
                ref={docRef}
                value={docSearch}
                onChange={e => { setDocSearch(e.target.value); setShowDocDrop(true); if (!e.target.value) setSelectedDoctor(null); }}
                onFocus={() => setShowDocDrop(true)}
                placeholder="Search doctor..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showDocDrop && docResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                  {docResults.map(d => (
                    <button key={d.id} onMouseDown={() => { setSelectedDoctor(d); setDocSearch(d.name); setShowDocDrop(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-50 text-sm">
                      <p className="font-medium text-slate-800">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.doctor_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedDoctor && (
              <div className="mt-1.5 text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span>{selectedDoctor.doctor_code}</span>
                <button onClick={() => { setSelectedDoctor(null); setDocSearch(''); }} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
              </div>
            )}
          </div>

          {/* Sales Rep */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sales Rep Name</label>
            <input value={salesRep} onChange={e => setSalesRep(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
          </div>

          {/* Delivery type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sale Type</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button onClick={() => setDeliveryType('store')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${deliveryType === 'store' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Store Purchase
              </button>
              <button onClick={() => setDeliveryType('delivery')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${deliveryType === 'delivery' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Home Delivery
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Totals */}
      <div className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 sticky top-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Bill Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Items:</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium">₹{formatCurrency(subtotal)}</span>
            </div>
            {itemDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Item Discounts:</span>
                <span>- ₹{formatCurrency(itemDiscount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Global Discount %</label>
              <input
                type="number" min="0" max="100" value={globalDiscPct}
                onChange={e => setGlobalDiscPct(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {globalDiscAmt > 0 && (
                <p className="text-xs text-red-600 mt-1">- ₹{formatCurrency(globalDiscAmt)}</p>
              )}
            </div>

            <div className="flex justify-between text-slate-500 text-xs">
              <span>SGST / CGST:</span>
              <span>₹0.00</span>
            </div>

            <div className="border-t-2 border-blue-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-bold text-slate-800 text-base">Grand Total:</span>
                <span className="font-bold text-blue-700 text-xl">₹{formatCurrency(grandTotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <p className="text-xs text-emerald-600 mt-0.5">You saved ₹{formatCurrency(totalDiscount)}</p>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              onClick={saveBill}
              disabled={saving || items.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Bill'}
            </button>
            <button onClick={clearBill} className="w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Clear Bill
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">New Customer</h3>
              <button onClick={() => setShowNewCust(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Name *</label>
                <input value={newCustForm.name} onChange={e => setNewCustForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile No *</label>
                <input value={newCustForm.mobile_no} onChange={e => setNewCustForm(p => ({ ...p, mobile_no: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Address</label>
                <input value={newCustForm.address} onChange={e => setNewCustForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowNewCust(false)} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm text-slate-600">Cancel</button>
              <button onClick={createNewCustomer} disabled={savingCust} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {savingCust ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && savedSale && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <Check size={20} />
                <span className="font-bold">Bill Saved Successfully!</span>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-slate-600 text-sm mb-1">Bill No: <strong>{savedSale.bill_no}</strong></p>
              <p className="text-slate-600 text-sm mb-5">Do you want to print the bill?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowPrintModal(false)} className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">No, Skip</button>
                <button onClick={handlePrint} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Printer size={16} /> Yes, Print
                </button>
              </div>
            </div>
          </div>
          {/* Hidden print content */}
          <div ref={printRef} style={{ display: 'none' }}>
            <InvoicePrint sale={savedSale} />
          </div>
        </div>
      )}
    </div>
  );
}
