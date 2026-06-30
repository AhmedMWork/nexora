import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, Hourglass, Sparkles, Timer } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { loadProducts } from '@/services/productService';
import { getDrops } from '@/services/drop.service';
import { isProductLiveDrop } from '@/lib/productVisibility';
import type { Drop, Product } from '@/types';

function toMillis(value: unknown, fallback: number) {
  if (!value) return fallback;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const parsed = new Date(value as string | number).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isDropLive(drop: Drop) {
  if (drop.status !== 'live') return false;
  const now = Date.now();
  const start = toMillis(drop.launchDate, 0);
  const end = toMillis(drop.endDate, Infinity);
  return now >= start && now <= end;
}

export default function DropsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [liveDrops, setLiveDrops] = useState<Drop[]>([]);
  const [scheduledDrops, setScheduledDrops] = useState<Drop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([loadProducts({ isLimitedDrop: true }), getDrops(false)])
      .then(([items, drops]) => {
        if (!mounted) return;
        const live = drops.filter(isDropLive);
        const scheduled = drops.filter((d) => d.status === 'scheduled');
        const liveDropIds = new Set(live.map((d) => d.id));
        const liveProductIds = new Set(live.flatMap((d) => d.productIds || []));
        const filtered = items.filter((product) => {
          if (isProductLiveDrop(product)) return true;
          if (live.length === 0) return false;
          return Boolean((product.dropId && liveDropIds.has(product.dropId)) || liveProductIds.has(product.id) || liveProductIds.has(product.slug));
        });
        setLiveDrops(live);
        setScheduledDrops(scheduled);
        setProducts(filtered);
      })
      .catch(() => {
        if (mounted) {
          setLiveDrops([]);
          setScheduledDrops([]);
          setProducts([]);
        }
      })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const totalPieces = useMemo(() => products.reduce((sum, product) => sum + product.sizes.reduce((sizeSum, size) => sizeSum + Math.max(0, size.stock), 0), 0), [products]);
  const hasLiveLimited = products.length > 0;

  return (
    <>
      <Helmet>
        <title>Limited Releases | NEXORA</title>
        <meta name="description" content="Shop NEXORA limited pieces marked directly from Products HQ. Active product-led drops appear without a large empty intro." />
      </Helmet>

      <main className="pt-24 pb-20 v3-page min-h-screen overflow-hidden">
        <section className="v3-shell">
          <div className="nexora-limited-compact-head">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="v33-limited-pill"><Sparkles className="h-3.5 w-3.5" /> Limited</span>
                <span className="v3-kicker">Product-led drops</span>
              </div>
              <h1 className="text-[clamp(2rem,5vw,4.6rem)] font-semibold leading-[0.95] tracking-[-0.055em] text-[var(--v33-text)]">
                {hasLiveLimited ? 'Limited pieces live now.' : 'No limited pieces are live right now.'}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--v33-muted)]">
                Products marked as Drop or Limited inside Products HQ appear here automatically during their selected window. No separate Drops page setup is needed.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div className="v33-stat-card"><Timer className="h-4 w-4" /><span>Limited status</span><strong>{hasLiveLimited ? 'Live now' : 'Closed'}</strong></div>
              <div className="v33-stat-card"><Sparkles className="h-4 w-4" /><span>Live pieces</span><strong>{products.length}</strong></div>
              <div className="v33-stat-card"><Hourglass className="h-4 w-4" /><span>Available stock</span><strong>{totalPieces}</strong></div>
            </div>
          </div>
        </section>

        <section className="v3-shell mt-8 lg:mt-12">
          <div className="v3-section-head">
            <div>
              <p className="v3-kicker">Limited releases</p>
              <h2>{hasLiveLimited ? 'Available now' : 'Between releases'}</h2>
            </div>
            <Link to="/shop" className="v3-inline-link">Browse all <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-3xl bg-[var(--v33-card)] animate-pulse" />)}
            </div>
          ) : products.length ? (
            <motion.div layout className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((product, i) => <ProductCard key={product.slug} product={product} index={i} />)}
            </motion.div>
          ) : (
            <div className="v33-empty-panel">
              <p>No limited release is live right now.</p>
              {scheduledDrops.length > 0 || liveDrops.length > 0 ? <p className="mt-2 text-xs">A limited window is scheduled or being prepared.</p> : <p className="mt-2 text-xs">Mark any active product as Drop in Products HQ to show it here.</p>}
              <Link to="/shop" className="v3-btn-secondary mt-5">Shop core essentials</Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
