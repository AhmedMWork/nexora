// ============================================================
// NEXORA — Admin Promotions Overview
// Product marketing flags are managed inside Products HQ.
// This page is now a simplified read-only control map.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, ExternalLink, Megaphone, RefreshCw, Sparkles, Star, Zap, type LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

type BucketKey = 'announcement' | 'newArrival' | 'bestSeller' | 'featured' | 'limitedDrop';

const bucketConfig: Record<BucketKey, { label: string; description: string; icon: LucideIcon }> = {
  announcement: {
    label: 'Animated Bar',
    description: 'Products selected to appear in the moving announcement bar across the storefront.',
    icon: Megaphone,
  },
  newArrival: {
    label: 'New Arrival',
    description: 'Products highlighted as fresh drops and recent releases.',
    icon: Sparkles,
  },
  bestSeller: {
    label: 'Best Seller',
    description: 'Products you want customers to notice as popular or fast-moving.',
    icon: Star,
  },
  featured: {
    label: 'Featured',
    description: 'Products selected for premium storefront placement.',
    icon: BadgePercent,
  },
  limitedDrop: {
    label: 'Limited Drop',
    description: 'Products connected to limited quantities or drop-style urgency.',
    icon: Zap,
  },
};

function productStock(product: Product) {
  return product.sizes.reduce((sum, size) => sum + Number(size.stock || 0), 0);
}

function ProductMiniCard({ product }: { product: Product }) {
  return (
    <article className="rounded-[24px] border border-[#332923] bg-[#0E0B0A] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
      <div className="flex gap-3">
        <img src={product.images[0] || '/assets/nexora-logo-bg.jpg'} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[#FFF0E1]">{product.name}</h3>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#BCAEA0]">{product.status} · {product.sku}</p>
            </div>
            <Link to={`/product/${product.slug}`} className="text-[#D7B98E] hover:text-[#FFF0E1]" title="Open storefront product">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BCAEA0]">
            <span className="rounded-full border border-[#5B473C] px-2 py-1">{formatPrice(product.price)}</span>
            <span className="rounded-full border border-[#5B473C] px-2 py-1">{productStock(product)} units</span>
            {product.showInAnnouncementBar && <span className="rounded-full border border-[#D7B98E]/40 px-2 py-1 text-[#D7B98E]">Bar priority {product.marketingPriority || 0}</span>}
          </div>
          {product.announcementText && <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#BCAEA0]">{product.announcementText}</p>}
        </div>
      </div>
    </article>
  );
}

export default function AdminPromotions() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [activeBucket, setActiveBucket] = useState<BucketKey>('announcement');
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { getAdminProducts } = await import('@/lib/supabase/db');
      setProducts(await getAdminProducts());
    } catch {
      toast.error('Could not load product marketing overview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadProducts(); }, []);

  const buckets = useMemo(() => ({
    announcement: products.filter((product) => product.showInAnnouncementBar),
    newArrival: products.filter((product) => product.isNewArrival),
    bestSeller: products.filter((product) => product.isBestSeller),
    featured: products.filter((product) => product.isFeatured),
    limitedDrop: products.filter((product) => product.isLimitedDrop),
  }), [products]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buckets[activeBucket]
      .filter((product) => !q || product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q) || product.slug.toLowerCase().includes(q))
      .sort((a, b) => Number(b.marketingPriority || 0) - Number(a.marketingPriority || 0));
  }, [activeBucket, buckets, query]);

  const ActiveIcon = bucketConfig[activeBucket].icon;

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-[#332923] bg-[#0E0B0A] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D7B98E]">Marketing Control</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#FFF0E1]"><BadgePercent className="h-6 w-6 text-[#D7B98E]" />Promotions are now inside Products HQ</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#BCAEA0]">
              Use Products HQ to mark products as New Arrival, Best Seller, Featured, Limited Drop, or to place them in the animated site bar. This page is a clean overview so you can see what is currently promoted without managing a separate complex campaign form.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadProducts} className="nexora-button"><RefreshCw className="h-4 w-4" />Refresh</button>
            <Link to="/nexora-admin/products" className="nexora-button-primary"><Sparkles className="h-4 w-4" />Edit in Products HQ</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {(Object.keys(bucketConfig) as BucketKey[]).map((key) => {
          const config = bucketConfig[key];
          const Icon = config.icon;
          return (
            <button key={key} onClick={() => setActiveBucket(key)} data-active={activeBucket === key} className="studio-chip min-h-[94px] flex-col items-start justify-center rounded-[24px] p-4 text-left">
              <div className="flex w-full items-center justify-between gap-2"><Icon className="h-4 w-4" /><span className="text-lg font-black">{buckets[key].length}</span></div>
              <span className="mt-2 text-xs font-bold uppercase tracking-[0.16em]">{config.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[30px] border border-[#332923] bg-[#0E0B0A] p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#FFF0E1]"><ActiveIcon className="h-5 w-5 text-[#D7B98E]" />{bucketConfig[activeBucket].label}</h2>
            <p className="mt-1 text-xs leading-5 text-[#BCAEA0]">{bucketConfig[activeBucket].description}</p>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search promoted products..." className="studio-input lg:max-w-sm" />
        </div>

        {isLoading ? (
          <div className="rounded-[24px] border border-[#332923] bg-[#17110F] p-8 text-center text-sm text-[#BCAEA0]">Loading promoted products...</div>
        ) : visibleProducts.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleProducts.map((product) => <ProductMiniCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="rounded-[24px] border border-[#332923] bg-[#17110F] p-8 text-center">
            <p className="text-sm font-semibold text-[#FFF0E1]">No products in this promotion bucket yet.</p>
            <p className="mt-2 text-xs leading-5 text-[#BCAEA0]">Open Products HQ, edit a product, then choose the Marketing & Visibility options.</p>
            <Link to="/nexora-admin/products" className="nexora-button-primary mt-4 inline-flex"><Sparkles className="h-4 w-4" />Open Products HQ</Link>
          </div>
        )}
      </div>
    </div>
  );
}
