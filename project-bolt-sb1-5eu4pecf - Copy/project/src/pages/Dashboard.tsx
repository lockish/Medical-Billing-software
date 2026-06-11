import { useEffect, useState } from 'react';
import { ShoppingCart, Package, Users, TrendingUp, AlertTriangle, Calendar, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/codeGenerator';
import { Page } from '../types';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

interface Stats {
  todaySales: number;
  todayBills: number;
  totalMedicines: number;
  lowStockCount: number;
  expiringCount: number;
  totalCustomers: number;
  monthSales: number;
  monthBills: number;
}

interface RecentSale {
  bill_no: string;
  bill_date: string;
  customer_name?: string;
  grand_total: number;
}

interface LowStockItem {
  product_code: string;
  medicine_name: string;
  current_stock: number;
  type: string;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    todaySales: 0, todayBills: 0, totalMedicines: 0,
    lowStockCount: 0, expiringCount: 0, totalCustomers: 0,
    monthSales: 0, monthBills: 0
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const [
      { data: todaySalesData },
      { data: monthSalesData },
      { count: medCount },
      { count: lowStockCnt },
      { count: expiryCnt },
      { count: custCount },
      { data: recentData },
      { data: lowStockData },
    ] = await Promise.all([
      supabase.from('sales').select('grand_total').gte('bill_date', today).eq('is_return', false),
      supabase.from('sales').select('grand_total').gte('bill_date', monthStart).eq('is_return', false),
      supabase.from('medicines').select('*', { count: 'exact', head: true }),
      supabase.from('medicines').select('*', { count: 'exact', head: true }).lt('current_stock', 10),
      supabase.from('medicines').select('*', { count: 'exact', head: true }).lte('expiry_date', thirtyDaysFromNow).not('expiry_date', 'is', null),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('bill_no, bill_date, customer_name, grand_total').eq('is_return', false).order('bill_date', { ascending: false }).limit(5),
      supabase.from('medicines').select('product_code, medicine_name, current_stock, type').lt('current_stock', 10).order('current_stock', { ascending: true }).limit(5),
    ]);

    const todayTotal = (todaySalesData ?? []).reduce((s, r) => s + Number(r.grand_total), 0);
    const monthTotal = (monthSalesData ?? []).reduce((s, r) => s + Number(r.grand_total), 0);

    setStats({
      todaySales: todayTotal,
      todayBills: todaySalesData?.length ?? 0,
      monthSales: monthTotal,
      monthBills: monthSalesData?.length ?? 0,
      totalMedicines: medCount ?? 0,
      lowStockCount: lowStockCnt ?? 0,
      expiringCount: expiryCnt ?? 0,
      totalCustomers: custCount ?? 0,
    });
    setRecentSales(recentData ?? []);
    setLowStock(lowStockData ?? []);
    setLoading(false);
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      sub: `${stats.todayBills} bills`,
      icon: <DollarSign size={20} />,
      color: 'bg-blue-600',
      light: 'bg-blue-50 text-blue-600',
    },
    {
      title: "Month Sales",
      value: formatCurrency(stats.monthSales),
      sub: `${stats.monthBills} bills`,
      icon: <TrendingUp size={20} />,
      color: 'bg-emerald-600',
      light: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: "Medicines",
      value: stats.totalMedicines.toString(),
      sub: 'in catalogue',
      icon: <Package size={20} />,
      color: 'bg-violet-600',
      light: 'bg-violet-50 text-violet-600',
    },
    {
      title: "Customers",
      value: stats.totalCustomers.toString(),
      sub: 'registered',
      icon: <Users size={20} />,
      color: 'bg-amber-600',
      light: 'bg-amber-50 text-amber-600',
    },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(stats.lowStockCount > 0 || stats.expiringCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {stats.lowStockCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
              <AlertTriangle size={16} className="text-amber-500" />
              <span><strong>{stats.lowStockCount}</strong> medicines with low stock (&lt;10 units)</span>
              <button onClick={() => onNavigate('medicines')} className="underline font-medium ml-1">View</button>
            </div>
          )}
          {stats.expiringCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              <Calendar size={16} className="text-red-500" />
              <span><strong>{stats.expiringCount}</strong> medicines expiring within 30 days</span>
              <button onClick={() => onNavigate('medicines')} className="underline font-medium ml-1">View</button>
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.title} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.light}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{card.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Activity size={16} className="text-blue-600" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Bill', page: 'new-bill' as Page, color: 'bg-blue-600 hover:bg-blue-700' },
            { label: 'New Purchase', page: 'new-purchase' as Page, color: 'bg-emerald-600 hover:bg-emerald-700' },
            { label: 'Add Medicine', page: 'medicines' as Page, color: 'bg-violet-600 hover:bg-violet-700' },
            { label: 'Sales History', page: 'sales-history' as Page, color: 'bg-amber-600 hover:bg-amber-700' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className={`${action.color} text-white rounded-lg py-2.5 text-sm font-medium transition-colors`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <ShoppingCart size={16} className="text-blue-600" /> Recent Bills
          </h3>
          {recentSales.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No bills yet today</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map(sale => (
                <div key={sale.bill_no} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{sale.bill_no}</p>
                    <p className="text-xs text-slate-400">{sale.customer_name || 'Walk-in Customer'} · {new Date(sale.bill_date).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">₹{formatCurrency(sale.grand_total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Low Stock Alert
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">All stocks are adequate</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map(item => (
                <div key={item.product_code} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.medicine_name}</p>
                    <p className="text-xs text-slate-400">{item.product_code} · {item.type}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.current_stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.current_stock} units
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
