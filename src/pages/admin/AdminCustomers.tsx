/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Activity, Flame, MessageCircle, RefreshCw, Search, ShoppingCart, Tag, TrendingDown, UserRound, UsersRound, WalletCards, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminEmptyBlock, AdminFilterChip, AdminHero, AdminMetricCard, AdminPageShell, AdminPanel, AdminStatusPill } from '@/components/admin/AdminCommandCenter';
import { formatPrice, formatTimestamp } from '@/lib/utils';

const tags = ['VIP', 'Hot lead', 'High intent', 'Needs follow-up', 'Asked for size', 'Abandoned cart', 'Price concern', 'ValU lead', 'Returning customer'];
const segments = ['all', 'hot', 'vip', 'repeat', 'needs-follow-up', 'inactive'] as const;

type Segment = typeof segments[number];


function leadScore(customer: any) {
  const orders = Number(customer.total_orders || 0);
  const revenue = Number(customer.total_revenue || 0);
  const tagsList: string[] = Array.isArray(customer.tags) ? customer.tags : [];
  let score = Math.min(100, orders * 28 + Math.floor(revenue / 150));
  if (tagsList.includes('Hot lead') || tagsList.includes('High intent')) score += 25;
  if (tagsList.includes('Abandoned cart')) score += 20;
  if (tagsList.includes('Asked for size') || tagsList.includes('ValU lead')) score += 12;
  if (tagsList.includes('Needs follow-up')) score += 10;
  if (tagsList.includes('VIP')) score += 35;
  return Math.max(0, Math.min(100, score));
}

function leadTemperature(score: number) {
  if (score >= 75) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Cold';
}

const whatsappTemplates = [
  'أهلاً، لاحظنا اهتمامك بمنتجات NEXORA. تحب نساعدك في اختيار المقاس المناسب؟',
  'المنتج اللي كنت مهتم بيه متاح حاليًا، والمعاينة متاحة وقت الاستلام أثناء وجود مندوب الشحن.',
  'لو متردد بسبب المقاس، ابعتلنا الطول والوزن وهنرشحلك الأنسب.',
  'تقدر تطمن: لو المنتج أو المقاس مش مناسب وقت الاستلام، يمكن ترجيعه فورًا قبل مغادرة المندوب.',
];

function waUrl(phone?: string, message?: string) {
  const normalized = String(phone || '').replace(/\D/g, '').replace(/^0/, '20');
  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return normalized ? `https://wa.me/${normalized}${encoded}` : '#';
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const { getCustomerProfiles } = await import('@/lib/supabase/db');
      setCustomers(await getCustomerProfiles());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load customer profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
    const repeat = customers.filter((c) => Number(c.total_orders || 0) > 1).length;
    const vip = customers.filter((c) => Number(c.total_revenue || 0) >= 3000 || Number(c.total_orders || 0) >= 3).length;
    const hot = customers.filter((c) => leadScore(c) >= 75).length;
    const noOrders = customers.filter((c) => Number(c.total_orders || 0) === 0).length;
    const topLocation = Object.entries(customers.reduce<Record<string, number>>((acc, c) => { const key = [c.governorate, c.city].filter(Boolean).join(' / '); if (key) acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data';
    return { totalRevenue, repeat, vip, topLocation, hot, noOrders };
  }, [customers]);

  const filtered = useMemo(() => customers.filter((customer) => {
    const text = `${customer.full_name || ''} ${customer.phone || ''} ${customer.email || ''} ${customer.governorate || ''} ${customer.city || ''} ${(customer.tags || []).join(' ')}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase().trim());
    const orders = Number(customer.total_orders || 0);
    const revenue = Number(customer.total_revenue || 0);
    const customerTags: string[] = Array.isArray(customer.tags) ? customer.tags : [];
    const matchesSegment = segment === 'all'
      || (segment === 'hot' && leadScore(customer) >= 75)
      || (segment === 'vip' && (revenue >= 3000 || orders >= 3 || customerTags.includes('VIP')))
      || (segment === 'repeat' && orders > 1)
      || (segment === 'needs-follow-up' && customerTags.includes('Needs follow-up'))
      || (segment === 'inactive' && orders === 0);
    return matchesQuery && matchesSegment;
  }), [customers, query, segment]);

  const updateTags = async (customer: any, tag: string) => {
    const current = Array.isArray(customer.tags) ? customer.tags : [];
    const next = current.includes(tag) ? current.filter((item: string) => item !== tag) : [...current, tag];
    try {
      const { updateCustomerProfile } = await import('@/lib/supabase/db');
      await updateCustomerProfile(customer.id, { tags: next });
      setCustomers((rows) => rows.map((row) => row.id === customer.id ? { ...row, tags: next } : row));
      setSelected((row: any) => row?.id === customer.id ? { ...row, tags: next } : row);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update tags');
    }
  };

  const saveNote = async () => {
    if (!selected || !note.trim()) return;
    try {
      const { addCustomerNote } = await import('@/lib/supabase/db');
      await addCustomerNote(selected.id, note.trim());
      toast.success('Customer note saved');
      setNote('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save note');
    }
  };

  return (
    <AdminPageShell>
      <AdminHero
        eyebrow="Customers"
        title="Customer Hub"
        description="A practical CRM layer for orders, value, tags, notes, WhatsApp follow-ups and location insights. No capability was removed; this organizes customer control in one place."
        actions={<button onClick={load} className="nexora-button-primary"><RefreshCw className="h-4 w-4" /> Refresh customers</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminMetricCard label="Customers" value={customers.length} helper="Unique customer profiles." icon={<UsersRound className="h-4 w-4" />} />
        <AdminMetricCard label="Revenue" value={formatPrice(stats.totalRevenue)} helper="Customer lifetime revenue." icon={<WalletCards className="h-4 w-4" />} tone="good" />
        <AdminMetricCard label="Repeat buyers" value={stats.repeat} helper="More than one order." icon={<RefreshCw className="h-4 w-4" />} tone={stats.repeat ? 'good' : 'neutral'} />
        <AdminMetricCard label="VIP" value={stats.vip} helper="High value or frequent buyers." icon={<UserRound className="h-4 w-4" />} tone="accent" />
        <AdminMetricCard label="Hot leads" value={stats.hot} helper="High score customers to contact first." icon={<Flame className="h-4 w-4" />} tone="accent" />
        <AdminMetricCard label="No orders" value={stats.noOrders} helper={`Top location: ${stats.topLocation}`} icon={<TrendingDown className="h-4 w-4" />} />
      </div>

      <AdminPanel title="Customer filters" description="Search by name, phone, city, email or tag. Segments keep daily follow-up fast.">
        <div className="flex flex-wrap gap-2">
          {segments.map((item) => <AdminFilterChip key={item} active={segment === item} onClick={() => setSegment(item)}>{item.replace(/-/g, ' ')}</AdminFilterChip>)}
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9D7159]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, phone, city, email, or tag..." className="studio-input pl-11" />
        </div>
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel title="Conversion watchlist" description="Focus first on people who showed intent but did not convert.">
          <div className="space-y-3 text-sm text-[#6F5D50]"><p className="flex items-center gap-2"><Flame className="h-4 w-4 text-[#9D7159]" /> Hot leads: contact within the day.</p><p className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-[#9D7159]" /> Abandoned cart / size questions: send a fit-assist message.</p><p className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#9D7159]" /> Mention preview on delivery to reduce hesitation.</p></div>
        </AdminPanel>
        <AdminPanel title="Why they may not buy" description="Common friction points to check before spending on ads."><ul className="space-y-2 text-sm text-[#6F5D50]"><li>• Size uncertainty: send size guidance.</li><li>• Trust: mention inspection while courier is present.</li><li>• Price: tag price-concern leads and offer bundle/ValU.</li></ul></AdminPanel>
        <AdminPanel title="Daily follow-up rule" description="A simple operating rhythm for conversion."><p className="text-sm leading-7 text-[#6F5D50]">Start with Hot leads, then Needs follow-up, then Asked for size. Every contact should include one clear next step and a WhatsApp action.</p></AdminPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
        <AdminPanel title="Customer profiles" description={`${filtered.length} profile(s) match your current view.`}>
          <div className="space-y-3">
            {isLoading ? <p className="p-6 text-center text-sm text-[#6F5D50]">Loading customers...</p> : filtered.length ? filtered.map((customer) => {
              const customerTags: string[] = Array.isArray(customer.tags) ? customer.tags : [];
              const score = leadScore(customer);
              const temp = leadTemperature(score);
              const isVip = customerTags.includes('VIP') || Number(customer.total_revenue || 0) >= 3000 || Number(customer.total_orders || 0) >= 3;
              return (
                <button key={customer.id || customer.phone} type="button" onClick={() => { setSelected(customer); setStatusDraft(customer.status || 'active'); }} className={`w-full rounded-[24px] border p-4 text-left transition hover:border-[#D6B58F] ${selected?.id === customer.id ? 'border-[#D6B58F] bg-[#F2E7D8]' : 'border-[#E4D6C5] bg-[#FAF5EE]'}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-[#231916]">{customer.full_name || 'Unnamed customer'}</h3>{isVip && <AdminStatusPill tone="accent">VIP</AdminStatusPill>}<AdminStatusPill tone={score >= 75 ? 'danger' : score >= 40 ? 'warn' : 'neutral'}>{temp} · {score}</AdminStatusPill></div>
                      <p className="mt-1 text-xs text-[#6F5D50]" dir="ltr">{customer.phone || customer.email || 'No contact data'}</p>
                      <p className="mt-1 text-xs text-[#8E7664]">{[customer.governorate, customer.city].filter(Boolean).join(' / ') || 'No location'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">{customerTags.map((tag) => <span key={tag} className="rounded-full border border-[#D7C5B2] bg-[#FFFDF8] px-3 py-1 text-[10px] font-bold text-[#6F5D50]">{tag}</span>)}</div>
                    </div>
                    <div className="grid min-w-[230px] grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl border border-[#E4D6C5] bg-[#FFFDF8] p-3"><span className="text-[#8E7664]">Orders</span><strong className="mt-1 block text-lg text-[#231916]">{customer.total_orders || 0}</strong></div>
                      <div className="rounded-2xl border border-[#E4D6C5] bg-[#FFFDF8] p-3"><span className="text-[#8E7664]">Spent</span><strong className="mt-1 block text-lg text-[#9D7159]">{formatPrice(customer.total_revenue || 0)}</strong></div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-[#E4D6C5] pt-3 text-[10px] text-[#8E7664] sm:grid-cols-3"><span>First source: {customer.first_source || '—'}</span><span>Campaign: {customer.last_campaign || '—'}</span><span>Last order: {customer.last_order_at ? formatTimestamp(new Date(customer.last_order_at), 'en-EG') : '—'}</span></div>
                </button>
              );
            }) : <AdminEmptyBlock title="No customers found" description="Create orders or clear filters to show customer profiles." />}
          </div>
        </AdminPanel>

        <aside className="space-y-4">
          <AdminPanel title="Customer drawer" description="Select a profile to add tags, notes and WhatsApp actions.">
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E4D6C5] bg-[#FAF5EE] p-4"><p className="text-base font-black text-[#231916]">{selected.full_name || 'Unnamed customer'}</p><p className="mt-1 text-xs text-[#6F5D50]" dir="ltr">{selected.phone || selected.email || 'No contact data'}</p></div>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#E4D6C5] bg-[#FFFDF8] p-3 text-xs"><div><span className="text-[#8E7664]">Lead score</span><strong className="block text-lg text-[#231916]">{leadScore(selected)}</strong></div><div><span className="text-[#8E7664]">Temperature</span><strong className="block text-lg text-[#9D7159]">{leadTemperature(leadScore(selected))}</strong></div><div><span className="text-[#8E7664]">Orders</span><strong className="block text-lg text-[#231916]">{selected.total_orders || 0}</strong></div></div>
                <select value={statusDraft || selected.status || 'active'} onChange={async (event) => { const value = event.target.value; setStatusDraft(value); try { const { updateCustomerProfile } = await import('@/lib/supabase/db'); await updateCustomerProfile(selected.id, { status: value }); setCustomers((rows) => rows.map((row) => row.id === selected.id ? { ...row, status: value } : row)); setSelected((row: any) => row ? { ...row, status: value } : row); toast.success('Customer status updated'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update status'); } }} className="studio-input"><option value="active">Active</option><option value="new">New</option><option value="interested">Interested</option><option value="contacted">Contacted</option><option value="needs_followup">Needs follow-up</option><option value="hot_lead">Hot lead</option><option value="converted">Converted</option><option value="lost">Lost</option><option value="vip">VIP</option></select>
                <div className="flex flex-wrap gap-2">{tags.map((tag) => <button key={tag} type="button" onClick={() => updateTags(selected, tag)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${Array.isArray(selected.tags) && selected.tags.includes(tag) ? 'border-[#231916] bg-[#231916] text-[#FFFDF8]' : 'border-[#E4D6C5] bg-[#FFFDF8] text-[#6F5D50]'}`}><Tag className="h-3 w-3" />{tag}</button>)}</div>
                <div className="rounded-2xl border border-[#E4D6C5] bg-[#FFFDF8] p-3"><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8E7664]">WhatsApp conversion templates</p><div className="space-y-2">{whatsappTemplates.map((message) => <a key={message} href={waUrl(selected.phone, message)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-[#E4D6C5] px-3 py-2 text-xs font-bold text-[#231916] hover:border-[#D6B58F]"><MessageCircle className="h-3.5 w-3.5" />{message}</a>)}</div></div>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} className="studio-input min-h-28" placeholder="Internal note: asked for size, needs follow-up, prefers WhatsApp..." />
                <button onClick={saveNote} disabled={!note.trim()} className="nexora-button-primary w-full"><Save className="h-4 w-4" /> Save note</button>
                {selected.phone && <a href={waUrl(selected.phone)} target="_blank" rel="noreferrer" className="nexora-button flex w-full justify-center"><MessageCircle className="h-4 w-4" /> Open WhatsApp</a>}
              </div>
            ) : <AdminEmptyBlock title="No profile selected" description="Choose a customer from the list to manage tags, notes and follow-up actions." />}
          </AdminPanel>

          <AdminPanel title="Segments" description="Quick view of operational customer groups.">
            <div className="space-y-2">{tags.map((tag) => <div key={tag} className="flex items-center justify-between rounded-2xl border border-[#E4D6C5] bg-[#FAF5EE] px-3 py-2 text-xs"><span>{tag}</span><strong>{customers.filter((customer) => Array.isArray(customer.tags) && customer.tags.includes(tag)).length}</strong></div>)}</div>
          </AdminPanel>
        </aside>
      </div>
    </AdminPageShell>
  );
}
