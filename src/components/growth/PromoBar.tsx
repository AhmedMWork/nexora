import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Flame, Percent, Sparkles } from 'lucide-react';
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
  if (hasDiscount(product)) return 'Sale';
  if (product.isLimitedDrop) return 'Limited';
  if (product.isBestSeller) return 'Best Seller';
  if (product.isNewArrival) return 'New Arrival';
  if (product.isFeatured) return 'Featured';
  return 'NEXORA';
}

function announcementCopy(product: Product) {
  const custom = product.announcementText?.replace(/\s+/g, ' ').trim();
  if (custom) return custom;

  const discount = discountPercent(product);
  if (discount > 0) return `${product.name} — ${discount}% off for a limited time`;
  if (product.isLimitedDrop) return `${product.name} — available while stock lasts`;
  if (product.isBestSeller) return `${product.name} — moving fast`;
  if (product.isNewArrival) return `${product.name} — just landed`;
  return `${product.name} — now available`;
}

function PromoIcon({ product }: { product: Product }) {
  if (hasDiscount(product)) return <Percent className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />;
  if (product.isLimitedDrop) return <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />;
  return <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />;
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
    root.style.setProperty('--promo-bar-offset', products.length ? 'var(--nexora-promo-height)' : '0px');
    return () => root.style.setProperty('--promo-bar-offset', '0px');
  }, [products.length]);

  const marqueeItems = useMemo(() => {
    if (!products.length) return [];
    const repeatedProducts = products.length === 1
      ? [...products, ...products, ...products, ...products, ...products]
      : [...products, ...products, ...products, ...products];
    return repeatedProducts.map((product, index) => ({ product, key: `${product.id}-${index}` }));
  }, [products]);

  if (!products.length) return null;

  return (
    <>
      <div className="nexora-promo-spacer" aria-hidden="true" />
      <div className="nexora-promo-bar" aria-label="NEXORA offers and product highlights">
        <div className="nexora-promo-surface" aria-hidden="true" />
        <div className="nexora-promo-edge nexora-promo-edge-top" aria-hidden="true" />
        <div className="nexora-promo-edge nexora-promo-edge-bottom" aria-hidden="true" />
        <div className="nexora-promo-fade nexora-promo-fade-left" aria-hidden="true" />
        <div className="nexora-promo-fade nexora-promo-fade-right" aria-hidden="true" />

        <div className="nexora-promo-track" role="list">
          {marqueeItems.map(({ product, key }) => {
            const sale = hasDiscount(product);
            return (
              <Link
                key={key}
                to={`/product/${product.slug}?utm_source=site&utm_medium=announcement_bar&utm_campaign=product_marketing`}
                className={`nexora-promo-item ${sale ? 'nexora-promo-item-sale' : ''}`}
                role="listitem"
              >
                <span className={`nexora-promo-badge ${sale ? 'nexora-promo-badge-sale' : ''}`}>
                  <PromoIcon product={product} />
                  {marketingLabel(product)}
                </span>
                <span className="nexora-promo-copy">{announcementCopy(product)}</span>
                <ArrowUpRight className="nexora-promo-arrow" aria-hidden="true" />
                <span className="nexora-promo-separator" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
