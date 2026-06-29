import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Flame, Percent, Sparkles, Star } from 'lucide-react';
import type { Product } from '@/types';

function hasDiscount(product: Product) {
  return Number(product.compareAtPrice || 0) > Number(product.price || 0);
}

function discountPercent(product: Product) {
  const compareAt = Number(product.compareAtPrice || 0);
  const price = Number(product.price || 0);
  if (!compareAt || !price || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function marketingLabel(product: Product) {
  if (hasDiscount(product)) return 'Special Price';
  if (product.isLimitedDrop) return 'Limited Drop';
  if (product.isBestSeller) return 'Best Seller';
  if (product.isNewArrival) return 'New Arrival';
  if (product.isFeatured) return 'Featured';
  return 'NEXORA Pick';
}

function announcementCopy(product: Product) {
  const custom = product.announcementText?.trim();
  if (custom) return custom;
  const discount = discountPercent(product);
  if (discount > 0) return `${product.name} now ${discount}% off for a limited time`;
  if (product.isLimitedDrop) return `${product.name} is available while stock lasts`;
  if (product.isBestSeller) return `${product.name} is moving fast`;
  if (product.isNewArrival) return `${product.name} just landed`;
  return `${product.name} is now available`;
}

function PromoIcon({ product }: { product: Product }) {
  if (hasDiscount(product)) return <Percent className="h-3.5 w-3.5" aria-hidden="true" />;
  if (product.isLimitedDrop) return <Flame className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />;
}

export default function PromoBar() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    import('@/lib/supabase/db')
      .then(({ getAnnouncementProducts }) => getAnnouncementProducts(10))
      .then((rows) => {
        if (!mounted) return;
        setProducts(rows.filter((product) => product.status === 'active' && product.showInAnnouncementBar));
      })
      .catch((error) => {
        console.warn('[announcement_bar_load_failed]', error);
        if (mounted) setProducts([]);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--promo-bar-offset', products.length ? '48px' : '0px');
    return () => root.style.setProperty('--promo-bar-offset', '0px');
  }, [products.length]);

  const marqueeItems = useMemo(() => {
    if (!products.length) return [];
    const enoughItems = products.length === 1 ? [...products, ...products, ...products, ...products] : [...products, ...products, ...products];
    return enoughItems.map((product, index) => ({ product, key: `${product.id}-${index}` }));
  }, [products]);

  if (!products.length) return null;

  return (
    <>
      <div className="h-12" aria-hidden="true" />
      <div className="nexora-promo-bar fixed inset-x-0 top-0 z-[60] h-12 overflow-hidden" aria-label="NEXORA offers and product highlights">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,253,248,0.98),rgba(247,238,226,0.96)_42%,rgba(235,219,200,0.98))] dark:bg-[linear-gradient(90deg,rgba(21,15,12,0.98),rgba(43,31,25,0.96)_45%,rgba(18,12,10,0.98))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(156,112,78,0.65),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(43,33,29,0.34),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(214,181,143,0.34),transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#FFFDF8] to-transparent dark:from-[#15100E]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#FFFDF8] to-transparent dark:from-[#15100E]" />

        <div className="nexora-promo-track relative flex h-full min-w-max items-center whitespace-nowrap">
          {marqueeItems.map(({ product, key }) => {
            const sale = hasDiscount(product);
            return (
              <Link
                key={key}
                to={`/product/${product.slug}?utm_source=site&utm_medium=announcement_bar&utm_campaign=product_marketing`}
                className="nexora-promo-item group inline-flex h-full items-center gap-3 px-5 text-[#3F2F29] transition-colors dark:text-[#FFF0E1]"
              >
                <span className={`nexora-promo-badge ${sale ? 'nexora-promo-badge-sale' : ''}`}>
                  <PromoIcon product={product} />
                  {marketingLabel(product)}
                </span>
                <span className="nexora-promo-copy">{announcementCopy(product)}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                <Star className="h-3 w-3 fill-current text-[#A97868] opacity-70 dark:text-[#D6B58F]" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
