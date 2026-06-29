import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Star } from 'lucide-react';
import type { Product } from '@/types';

function marketingLabel(product: Product) {
  if (product.isBestSeller) return 'Best Seller';
  if (product.isLimitedDrop) return 'Limited Drop';
  if (product.isNewArrival) return 'New Arrival';
  if (product.isFeatured) return 'Featured';
  return 'NEXORA Pick';
}

function announcementCopy(product: Product) {
  if (product.announcementText?.trim()) return product.announcementText.trim();
  if (product.isBestSeller) return `${product.name} is moving fast`;
  if (product.isLimitedDrop) return `${product.name} is available while stock lasts`;
  if (product.isNewArrival) return `${product.name} just landed`;
  return `${product.name} is now available`;
}

export default function PromoBar() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    import('@/lib/supabase/db')
      .then(({ getAnnouncementProducts }) => getAnnouncementProducts(8))
      .then((rows) => {
        if (mounted) setProducts(rows.filter((product) => product.status === 'active' && product.showInAnnouncementBar));
      })
      .catch((error) => {
        console.warn('[announcement_bar_load_failed]', error);
        if (mounted) setProducts([]);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--promo-bar-offset', products.length ? '38px' : '0px');
    return () => root.style.setProperty('--promo-bar-offset', '0px');
  }, [products.length]);

  const marqueeItems = useMemo(() => {
    if (!products.length) return [];
    return [...products, ...products].map((product, index) => ({ product, key: `${product.id}-${index}` }));
  }, [products]);

  if (!products.length) return null;

  return (
    <>
    <div className="h-[38px]" aria-hidden="true" />
    <div className="fixed inset-x-0 top-0 z-[60] h-[38px] overflow-hidden border-b border-[#332923] bg-[#050505] text-[#f4f0e8] shadow-[0_10px_32px_rgba(0,0,0,0.24)]">
      <style>{`@keyframes nexora-promo-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#050505] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#050505] to-transparent" />
      <div className="flex h-full min-w-max items-center gap-5 whitespace-nowrap" style={{ animation: 'nexora-promo-marquee 28s linear infinite' }}>
        {marqueeItems.map(({ product, key }) => (
          <Link
            key={key}
            to={`/product/${product.slug}?utm_source=site&utm_medium=announcement_bar&utm_campaign=product_marketing`}
            className="group inline-flex h-full items-center gap-3 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#d6b58f] transition hover:text-[#fff0e1]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#d6b58f] transition-transform group-hover:scale-110" />
            <span className="rounded-full border border-[#d6b58f]/35 px-2 py-1 text-[9px] text-[#f4f0e8]">{marketingLabel(product)}</span>
            <span>{announcementCopy(product)}</span>
            <Star className="h-3 w-3 fill-[#d6b58f] text-[#d6b58f]" />
          </Link>
        ))}
      </div>
    </div>
    </>
  );
}
