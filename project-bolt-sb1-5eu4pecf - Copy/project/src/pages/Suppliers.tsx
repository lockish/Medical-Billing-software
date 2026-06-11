import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateSupplierCode } from '../lib/codeGenerator';
import { Supplier } from '../types';

const empty = { supplier_name: '', phone_number: '', address: '', gstin: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [autoCode, setAutoCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('suppliers').select('*').order('supplier_name');
    if (search) q = q.ilike('supplier_name', `%${search}%`);
    const { data } = await q;
    setSuppliers(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = async () => {
    const code = await generateSupplierCode();
    setAutoCode(code); setEditing(null); setForm({ ...empty }); setError(''); setShowModal(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s); setAutoCode(s.supplier_code);
    setForm({ supplier_name: s.supplier_name, phone_number: s.phone_number ?? '', address: s.address ?? '', gstin: s.gstin ?? '' });
    setError(''); setShowModal(true);
  };
  const save = async () => {
    if (!form.supplier_name.trim()) { setError('Supplier name is required'); return; }
    setSaving(true); setError('');
    let err;
    if (editing) {
      ({ error: err } = await supabase.from('suppliers').update(form).eq('id', editing.id));
    } else {
      ({ error: err } = await supabase.from('suppliers').insert({ ...form, supplier_code: autoCode }));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false); load();
  };
  const del = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    setDeleteConfirm(null); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Truck size={20} className="text-blue-600" /> Suppliers Master
        </h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Code', 'Supplier Name', 'Phone', 'GSTIN', 'Address', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No suppliers found</td></tr>
            ) : suppliers.map(s => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.supplier_code}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{s.supplier_name}</td>
                <td className="px-4 py-3 text-slate-600">{s.phone_number || '-'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{s.gstin || '-'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s.address || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={14} />{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Supplier Code *</label>
                <input value={autoCode} readOnly className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Supplier Name *</label>
                <input value={form.supplier_name} onChange={e => setForm(p => ({ ...p, supplier_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                <input value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">GSTIN (optional)</label>
                <input value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="15-digit GSTIN" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">Delete Supplier?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={() => del(deleteConfirm)} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
