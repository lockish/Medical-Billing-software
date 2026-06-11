import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateProductCode, extractPackQty, formatCurrency, formatDate } from '../lib/codeGenerator';
import { Medicine } from '../types';

const TYPES = ['Tablet', 'Syrup', 'Powder', 'Capsule', 'Injection', 'Gel', 'Ointment', 'Cream'] as const;
const SCHEDULES = ['S', 'H', 'H1', 'H2', 'H3', 'Narcotic'] as const;

const empty: Omit<Medicine, 'id' | 'product_code' | 'created_at' | 'updated_at'> = {
  medicine_name: '', generic_name: '', type: 'Tablet', hsn_code: '',
  schedule: 'S', pack_size: '', pack_size_qty: 1, mrp: 0,
  selling_price: 0, purchase_price: 0, batch_no: '', mfg_date: '',
  expiry_date: '', current_stock: 0, rack_location: '',
};

export default function Medicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('medicines').select('*').order('medicine_name');
    if (search) q = q.ilike('medicine_name', `%${search}%`);
    const { data } = await q;
    setMedicines(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = async () => {
    const code = await generateProductCode();
    setEditing(null);
    setForm({ ...empty });
    setShowModal(true);
    setError('');
    setAutoCode(code);
  };

  const [autoCode, setAutoCode] = useState('');

  const openEdit = (m: Medicine) => {
    setEditing(m);
    setForm({
      medicine_name: m.medicine_name, generic_name: m.generic_name ?? '',
      type: m.type, hsn_code: m.hsn_code ?? '', schedule: m.schedule,
      pack_size: m.pack_size, pack_size_qty: m.pack_size_qty, mrp: m.mrp,
      selling_price: m.selling_price, purchase_price: m.purchase_price,
      batch_no: m.batch_no ?? '', mfg_date: m.mfg_date ?? '', expiry_date: m.expiry_date ?? '',
      current_stock: m.current_stock, rack_location: m.rack_location ?? '',
    });
    setAutoCode(m.product_code);
    setShowModal(true);
    setError('');
  };

  const handlePackSizeChange = (val: string) => {
    const qty = extractPackQty(val);
    setForm(p => ({ ...p, pack_size: val, pack_size_qty: qty }));
  };

  const save = async () => {
    if (!form.medicine_name.trim()) { setError('Medicine name is required'); return; }
    if (!form.pack_size.trim()) { setError('Pack size is required'); return; }
    if (!form.type) { setError('Type is required'); return; }
    if (!form.schedule) { setError('Schedule is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      pack_size_qty: form.pack_size_qty || extractPackQty(form.pack_size),
      updated_at: new Date().toISOString(),
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from('medicines').update(payload).eq('id', editing.id));
    } else {
      ({ error: err } = await supabase.from('medicines').insert({ ...payload, product_code: autoCode }));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false);
    load();
  };

  const del = async (id: string) => {
    await supabase.from('medicines').delete().eq('id', id);
    setDeleteConfirm(null);
    load();
  };

  const scheduleColor = (s: string) => {
    const map: Record<string, string> = {
      'S': 'bg-green-100 text-green-700', 'H': 'bg-blue-100 text-blue-700',
      'H1': 'bg-amber-100 text-amber-700', 'H2': 'bg-orange-100 text-orange-700',
      'H3': 'bg-red-100 text-red-700', 'Narcotic': 'bg-purple-100 text-purple-700',
    };
    return map[s] ?? 'bg-slate-100 text-slate-700';
  };

  const ratePerUnit = form.pack_size_qty > 0 ? form.selling_price / form.pack_size_qty : 0;
  const marginPerUnit = form.pack_size_qty > 0 ? (form.selling_price - form.purchase_price) / form.pack_size_qty : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Package size={20} className="text-blue-600" /> Medicines Master
        </h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search medicines..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Code', 'Name', 'Type', 'Schedule', 'Pack Size', 'Rate/Unit', 'MRP', 'Stock', 'Expiry', 'Rack', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : medicines.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">No medicines found</td></tr>
              ) : medicines.map(m => {
                const rate = m.pack_size_qty > 0 ? m.selling_price / m.pack_size_qty : 0;
                const isLow = m.current_stock < 10;
                const isExpiring = m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 30 * 86400000);
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.product_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{m.medicine_name}</p>
                      {m.generic_name && <p className="text-xs text-slate-400">{m.generic_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scheduleColor(m.schedule)}`}>#{m.schedule}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{m.pack_size}</td>
                    <td className="px-4 py-3 font-medium text-blue-700">₹{rate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">₹{formatCurrency(m.mrp)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {m.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={isExpiring ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {formatDate(m.expiry_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{m.rack_location}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteConfirm(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editing ? 'Edit Medicine' : 'Add Medicine'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Product Code *</label>
                  <input value={autoCode} readOnly className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Medicine Name *</label>
                  <input
                    value={form.medicine_name}
                    onChange={e => setForm(p => ({ ...p, medicine_name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Paracetamol 500mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Generic Name</label>
                  <input
                    value={form.generic_name}
                    onChange={e => setForm(p => ({ ...p, generic_name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Acetaminophen"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as typeof form.type }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Schedule *</label>
                  <select value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value as typeof form.schedule }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SCHEDULES.map(s => <option key={s}>#{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">HSN Code</label>
                  <input value={form.hsn_code} onChange={e => setForm(p => ({ ...p, hsn_code: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Pack Size * <span className="font-normal text-slate-400">(e.g. 15 Tablets)</span></label>
                  <input value={form.pack_size} onChange={e => handlePackSizeChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 15 Tablets" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Pack Qty (auto-parsed)</label>
                  <input value={form.pack_size_qty} onChange={e => setForm(p => ({ ...p, pack_size_qty: parseFloat(e.target.value) || 1 }))}
                    type="number" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">MRP per Pack *</label>
                  <input value={form.mrp} onChange={e => setForm(p => ({ ...p, mrp: parseFloat(e.target.value) || 0 }))}
                    type="number" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Selling Price per Pack *</label>
                  <input value={form.selling_price} onChange={e => setForm(p => ({ ...p, selling_price: parseFloat(e.target.value) || 0 }))}
                    type="number" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Purchase Price per Pack *</label>
                  <input value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: parseFloat(e.target.value) || 0 }))}
                    type="number" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Current Stock * (units)</label>
                  <input value={form.current_stock} onChange={e => setForm(p => ({ ...p, current_stock: parseFloat(e.target.value) || 0 }))}
                    type="number"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Batch No</label>
                  <input value={form.batch_no} onChange={e => setForm(p => ({ ...p, batch_no: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mfg Date</label>
                  <input value={form.mfg_date} onChange={e => setForm(p => ({ ...p, mfg_date: e.target.value }))}
                    type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Expiry Date</label>
                  <input value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                    type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Rack / Location</label>
                  <input value={form.rack_location} onChange={e => setForm(p => ({ ...p, rack_location: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. A-3" />
                </div>
              </div>

              {/* Calculated preview */}
              {form.pack_size_qty > 0 && form.selling_price > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-6 text-sm">
                  <div><span className="text-slate-500">Rate/Unit:</span> <strong className="text-blue-700">₹{ratePerUnit.toFixed(2)}</strong></div>
                  <div><span className="text-slate-500">Margin/Unit:</span> <strong className={marginPerUnit >= 0 ? 'text-emerald-700' : 'text-red-700'}>₹{marginPerUnit.toFixed(2)}</strong></div>
                  <div><span className="text-slate-500">Margin %:</span> <strong className={marginPerUnit >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {form.selling_price > 0 ? ((marginPerUnit / (form.selling_price / form.pack_size_qty)) * 100).toFixed(1) : 0}%
                  </strong></div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? 'Saving...' : editing ? 'Update Medicine' : 'Save Medicine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">Delete Medicine?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => del(deleteConfirm)} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
