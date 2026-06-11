import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Package, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/codeGenerator';

interface SalesSummary {
  date: string;
  total: number;
  bills: number;
}

interface TopMedicine {
  medicine_name: string;
  total_qty: number;
  total_amount: number;
}

interface ExpiryAlert {
  product_code: string;
  medicine_name: string;
  type: string;
  expiry_date: string;
  current_stock: number;
  batch_no?: string;
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [topMedicines, setTopMedicines] = useState<TopMedicine[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [lowStock, setLowStock] = useState<ExpiryAlert[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, bills: 0, avgBill: 0, purchaseValue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sales' | 'expiry' | 'stock' | 'medicines'>('sales');

  useEffect(() => { loadReports(); }, [dateFrom, dateTo]);

  const loadReports = async () => {
    setLoading(true);
    const [salesData, purchasesData, expiryData, lowStockData, saleItemsData] = await Promise.all([
      supabase.from('sales').select('bill_date, grand_total').gte('bill_date', dateFrom).lte('bill_date', dateTo + 'T23:59:59').eq('is_return', false),
      supabase.from('purchases').select('grand_total').gte('purchase_date', dateFrom).lte('purchase_date', dateTo + 'T23:59:59'),
      supabase.from('medicines').select('product_code, medicine_name, type, expiry_date, current_stock, batch_no')
        .lte('expiry_date', new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10))
        .not('expiry_date', 'is', null)
        .order('expiry_date'),
      supabase.from('medicines').select('product_code, medicine_name, type, expiry_date, current_stock, batch_no')
        .lt('current_stock', 10)
        .order('current_stock'),
      supabase.from('sale_items').select('medicine_name, quantity, amount')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59'),
    ]);

    const sales = salesData.data ?? [];
    const purchases = purchasesData.data ?? [];
    const items = saleItemsData.data ?? [];

    // Daily summary
    const byDate: Record<string, { total: number; bills: number }> = {};
    for (const s of sales) {
      const d = s.bill_date.slice(0, 10);
      if (!byDate[d]) byDate[d] = { total: 0, bills: 0 };
      byDate[d].total += Number(s.grand_total);
      byDate[d].bills += 1;
    }
    const summary = Object.entries(byDate).map(([date, v]) => ({ date, ...v })).sort((a, b) => b.date.localeCompare(a.date));
    setSalesSummary(summary);

    // Top medicines
    const medMap: Record<string, { total_qty: number; total_amount: number }> = {};
    for (const item of items) {
      if (!medMap[item.medicine_name]) medMap[item.medicine_name] = { total_qty: 0, total_amount: 0 };
      medMap[item.medicine_name].total_qty += Number(item.quantity);
      medMap[item.medicine_name].total_amount += Number(item.amount);
    }
    const top = Object.entries(medMap).map(([medicine_name, v]) => ({ medicine_name, ...v })).sort((a, b) => b.total_amount - a.total_amount).slice(0, 10);
    setTopMedicines(top);

    setExpiryAlerts(expiryData.data ?? []);
    setLowStock(lowStockData.data ?? []);

    const revenue = sales.reduce((s, r) => s + Number(r.grand_total), 0);
    const purchaseTotal = purchases.reduce((s, r) => s + Number(r.grand_total), 0);
    setTotals({ revenue, bills: sales.length, avgBill: sales.length > 0 ? revenue / sales.length : 0, purchaseValue: purchaseTotal });
    setLoading(false);
  };

  const tabs = [
    { id: 'sales' as const, label: 'Sales Report', icon: <TrendingUp size={14} /> },
    { id: 'medicines' as const, label: 'Top Medicines', icon: <BarChart3 size={14} /> },
    { id: 'expiry' as const, label: 'Expiry Alerts', icon: <Calendar size={14} /> },
    { id: 'stock' as const, label: 'Low Stock', icon: <AlertTriangle size={14} /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-600" /> Reports
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
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
          <div className="col-span-2 flex gap-2">
            {[
              { label: 'Today', fn: () => { const d = new Date().toISOString().slice(0, 10); setDateFrom(d); setDateTo(d); } },
              { label: 'This Month', fn: () => { setDateFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); } },
              { label: 'Last Month', fn: () => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10)); setDateTo(new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10)); } },
            ].map(q => (
              <button key={q.label} onClick={q.fn} className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Revenue', value: `₹${formatCurrency(totals.revenue)}`, icon: <DollarSign size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Bills', value: totals.bills.toString(), icon: <TrendingUp size={18} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Avg Bill Value', value: `₹${formatCurrency(totals.avgBill)}`, icon: <BarChart3 size={18} />, color: 'text-violet-600 bg-violet-50' },
          { label: 'Purchase Value', value: `₹${formatCurrency(totals.purchaseValue)}`, icon: <Package size={18} />, color: 'text-amber-600 bg-amber-50' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${k.color}`}>{k.icon}</div>
            <p className="text-xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">Loading...</div>
          ) : activeTab === 'sales' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Date', 'Total Bills', 'Revenue'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesSummary.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-slate-400">No sales in selected period</td></tr>
                ) : salesSummary.map(s => (
                  <tr key={s.date} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-slate-600">{s.bills}</td>
                    <td className="px-4 py-3 font-bold text-blue-700">₹{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'medicines' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['#', 'Medicine', 'Total Qty Sold', 'Total Revenue'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topMedicines.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-400">No data in selected period</td></tr>
                ) : topMedicines.map((m, i) => (
                  <tr key={m.medicine_name} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{m.medicine_name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.total_qty.toFixed(0)}</td>
                    <td className="px-4 py-3 font-bold text-blue-700">₹{formatCurrency(m.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'expiry' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Code', 'Medicine', 'Type', 'Batch', 'Expiry Date', 'Days Left', 'Stock'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiryAlerts.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">No expiry alerts</td></tr>
                ) : expiryAlerts.map(m => {
                  const daysLeft = m.expiry_date ? Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000) : 999;
                  return (
                    <tr key={m.product_code} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.product_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.medicine_name}</td>
                      <td className="px-4 py-3 text-slate-600">{m.type}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{m.batch_no || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(m.expiry_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 0 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {daysLeft <= 0 ? 'EXPIRED' : `${daysLeft}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.current_stock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Code', 'Medicine', 'Type', 'Current Stock', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">All stocks are adequate</td></tr>
                ) : lowStock.map(m => (
                  <tr key={m.product_code} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.product_code}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{m.medicine_name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold ${m.current_stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{m.current_stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.current_stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {m.current_stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
