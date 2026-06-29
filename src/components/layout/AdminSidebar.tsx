// ============================================================
// NEXORA — Premium HQ Sidebar
// Desktop sidebar plus a true mobile drawer with backdrop, scroll lock, and quick search.
// ============================================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Warehouse,
  Star,
  Tag,
  CalendarClock,
  BarChart3,
  UserRound,
  SearchCheck,
  ShieldCheck,
  Settings,
  Activity,
  MousePointerClick,
  UserPlus,
  Target,
  FileBarChart,
  Menu,
  X,
  ExternalLink,
  BadgePercent,
  ClipboardList,
  MonitorSmartphone,
  Truck,
  Rocket,
  Search,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS } from '@/lib/constants';

const iconMap: Record<string, ElementType> = {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Warehouse,
  Star,
  Tag,
  CalendarClock,
  BarChart3,
  UserRound,
  SearchCheck,
  ShieldCheck,
  Settings,
  Activity,
  MousePointerClick,
  UserPlus,
  Target,
  FileBarChart,
  BadgePercent,
  ClipboardList,
  MonitorSmartphone,
  Truck,
  Rocket,
};

export default function AdminSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobileOpen(false);
    setSearchTerm('');
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const groups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ADMIN_NAV_GROUPS;
    return ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      links: group.links.filter((link) => `${link.label} ${link.description}`.toLowerCase().includes(q)),
    })).filter((group) => group.links.length > 0);
  }, [searchTerm]);

  const content = (
    <>
      <div className="border-b border-[#E9DDCF] px-5 py-5">
        <Link to="/nexora-admin/dashboard" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3">
          <img src="/assets/nexora-logo.png" alt="NEXORA" className="h-9 w-auto object-contain" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#231916]">NEXORA</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E7664]">Operations HQ</p>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-4 lg:hidden">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A48F7E]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search admin tools..."
            className="h-12 w-full rounded-2xl border border-[#E4D6C5] bg-[#FFFDF8] pl-11 pr-4 text-sm font-semibold text-[#231916] outline-none placeholder:text-[#A48F7E] focus:border-[#D6B58F]"
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 pb-28 lg:pb-5">
        {groups.map((group) => (
          <section key={group.label} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#B39D89]">{group.label}</p>
            <div className="space-y-1.5">
              {group.links.map((link) => {
                const Icon = iconMap[link.icon] || LayoutDashboard;
                const isActive = location.pathname === link.href || (link.href !== '/nexora-admin/dashboard' && location.pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    title={link.description}
                    className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'border-[#D6B58F]/70 bg-[#F2E7D8] text-[#231916] shadow-[0_16px_32px_rgba(43,33,29,.08)]'
                        : 'border-transparent text-[#6F5D50] hover:border-[#E4D6C5] hover:bg-[#FAF5EE] hover:text-[#231916]'
                    }`}
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-xl ${isActive ? 'bg-[#FFFDF8] text-[#9D7159]' : 'bg-[#F3E9DC] text-[#A28A74] group-hover:text-[#9D7159]'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{link.label}</span>
                      <span className="mt-0.5 hidden truncate text-[10px] font-medium text-[#8E7664] lg:block">{link.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="space-y-2 border-t border-[#E9DDCF] p-4">
        <Link
          to="/nexora-admin/launch"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center justify-between rounded-2xl border border-[#E4D6C5] bg-[#FAF5EE] px-4 py-3 text-xs font-semibold text-[#6F5D50] hover:border-[#D6B58F] hover:text-[#231916]"
        >
          <span>Launch Mode</span>
          <Rocket className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold text-[#6F5D50] transition hover:bg-[#FAF5EE] hover:text-[#9D7159]"
        >
          <span>Open Store</span>
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        className="fixed left-3 top-2.5 z-[70] grid h-11 w-11 place-items-center rounded-full border border-[#E4D6C5] bg-[#FFFDF8] text-[#231916] shadow-[0_14px_32px_rgba(43,33,29,.12)] lg:hidden"
        aria-label={isMobileOpen ? 'Close NEXORA HQ navigation' : 'Open NEXORA HQ navigation'}
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-[#231916]/35 backdrop-blur-[3px] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close admin navigation backdrop"
        />
      )}

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[268px] flex-col border-r border-[#E4D6C5] bg-[#FFFDF8]/96 shadow-[16px_0_45px_rgba(43,33,29,.06)] backdrop-blur-xl lg:flex">
        {content}
      </aside>

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-dvh w-[88vw] max-w-[360px] flex-col overflow-hidden rounded-r-[28px] border-r border-[#E4D6C5] bg-[#FFFDF8] shadow-[28px_0_80px_rgba(43,33,29,.22)] transition-transform duration-300 lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isMobileOpen}
      >
        {content}
      </aside>
    </>
  );
}
