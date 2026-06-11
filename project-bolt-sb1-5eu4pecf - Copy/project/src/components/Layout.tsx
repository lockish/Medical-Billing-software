import { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, ChevronDown, ChevronRight, Package,
  Users, Stethoscope, Truck, BarChart3, Plus, History, RotateCcw,
  ShoppingBag, Heart, Menu, X
} from 'lucide-react';
import { Page } from '../types';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  page?: Page;
  children?: { label: string; page: Page; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, page: 'dashboard' },
  {
    label: 'Sales',
    icon: <ShoppingCart size={18} />,
    children: [
      { label: 'New Bill', page: 'new-bill', icon: <Plus size={16} /> },
      { label: 'Sales Return', page: 'sales-return', icon: <RotateCcw size={16} /> },
      { label: 'Sales History', page: 'sales-history', icon: <History size={16} /> },
    ],
  },
  {
    label: 'Purchase',
    icon: <ShoppingBag size={18} />,
    children: [
      { label: 'New Purchase', page: 'new-purchase', icon: <Plus size={16} /> },
      { label: 'Purchase History', page: 'purchase-history', icon: <History size={16} /> },
    ],
  },
  { label: 'Medicines', icon: <Package size={18} />, page: 'medicines' },
  { label: 'Customers', icon: <Users size={18} />, page: 'customers' },
  { label: 'Doctors', icon: <Stethoscope size={18} />, page: 'doctors' },
  { label: 'Suppliers', icon: <Truck size={18} />, page: 'suppliers' },
  { label: 'Reports', icon: <BarChart3 size={18} />, page: 'reports' },
];

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Sales', 'Purchase']));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (page?: Page) => page === currentPage;
  const isParentActive = (item: NavItem) =>
    item.children?.some(c => c.page === currentPage) ?? false;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 bg-blue-700">
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-white" fill="white" />
            <div>
              <h1 className="font-bold text-white text-sm leading-tight tracking-wide">OBITO MEDICALS</h1>
              <p className="text-blue-200 text-xs">Your Health, Our Care</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map(item => (
            <div key={item.label} className="mb-0.5">
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isParentActive(item)
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={isParentActive(item) ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                      {item.label}
                    </span>
                    {expandedMenus.has(item.label)
                      ? <ChevronDown size={14} className="text-slate-400" />
                      : <ChevronRight size={14} className="text-slate-400" />}
                  </button>
                  {expandedMenus.has(item.label) && (
                    <div className="ml-4 pl-3 border-l border-slate-100 mt-0.5 space-y-0.5">
                      {item.children.map(child => (
                        <button
                          key={child.page}
                          onClick={() => onNavigate(child.page)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                            ${isActive(child.page)
                              ? 'bg-blue-600 text-white font-medium shadow-sm'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                        >
                          <span>{child.icon}</span>
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => onNavigate(item.page!)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive(item.page)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <span className={isActive(item.page) ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">Obito Medicals POS v1.0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm leading-tight">
              {[
                ...navItems.filter(n => !n.children).map(n => ({ label: n.label, page: n.page! })),
                ...navItems.flatMap(n => n.children ?? []).map(c => ({ label: c.label, page: c.page })),
              ].find(n => n.page === currentPage)?.label ?? 'Dashboard'}
            </h2>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
