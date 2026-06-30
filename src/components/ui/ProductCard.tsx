// ============================================================
// NEXORA — Midnight Atelier Product Card
// ============================================================

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useCartStore } from '@/stores/cartStore';
import type { Product } from '@/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const inWishlist = isInWishlist(product.id);
  const discount = calculateDiscount(product.price, product.compareAtPrice);
  const isOnSale = discount > 0;
  const availableSizes = product.sizes.filter((s) => s.stock > 0);
  const totalStock = product.sizes.reduce((sum, size) => sum + Math.max(0, size.stock), 0);
  const isSoldOut = product.status === 'sold_out' || totalStock <= 0;
  const isLowStock = !isSoldOut && totalStock <= 5;
  const primaryImage = product.images[0] || product.thumbnail || '/assets/nexora-logo-bg.jpg';
  const secondaryImage = product.images.find((image) => image && image !== primaryImage);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.colors.length > 0) {
      toast('Choose size and color on the product page first.');
      return;
    }
    const defaultSize = availableSizes[0]?.size;
    if (!defaultSize || isSoldOut) {
      toast.error('This piece is currently unavailable');
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      size: defaultSize,
      quantity: 1,
      image: primaryImage,
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product.id);
    toast(inWishlist ? 'Removed from wishlist' : 'Added to wishlist', {
      icon: inWishlist ? '💔' : '❤️',
    });
  };

  const badge = isOnSale
    ? `Save ${discount}%`
    : isSoldOut
      ? 'Sold Out'
      : isLowStock
        ? 'Low Stock'
        : (product.isDrop || product.isLimitedDrop)
          ? (product.dropLabel || 'Limited')
          : product.isPromotion
            ? (product.promotionLabel || 'Offer')
            : product.isNewArrival
              ? 'New'
              : product.isBestSeller
                ? 'Best Seller'
                : product.isCore
                  ? (product.coreLabel || 'Core')
                  : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '80px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.25) }}
      className="h-full"
    >
      <Link
        to={`/product/${product.slug}`}
        className={`v3-product-card group block h-full border transition-all duration-500 ${isOnSale ? 'nexora-sale-card' : ''}`}
      >
        <div className="v3-product-media relative aspect-[3/4] overflow-hidden">
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width={600}
            height={800}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.035] ${secondaryImage ? 'group-hover:opacity-0' : ''} ${isSoldOut ? 'grayscale opacity-60' : 'opacity-100'}`}
          />

          {secondaryImage && (
            <img
              src={secondaryImage}
              alt={`${product.name} alternate view`}
              loading="lazy"
              decoding="async"
              width={600}
              height={800}
              className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.035] group-hover:opacity-100 ${isSoldOut ? 'grayscale' : ''}`}
            />
          )}

          <div className="v3-product-grad absolute inset-0 opacity-35 sm:opacity-45" />
          {isOnSale && <div className="nexora-sale-shimmer" aria-hidden="true" />}

          {badge && (
            <span
              className={`absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.12em] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1.5 sm:text-[9px] ${
                isSoldOut
                  ? 'border border-[#8a8175]/30 bg-[#050505]/68 text-[#f4f0e8] backdrop-blur-xl'
                  : isOnSale
                    ? 'nexora-discount-pill'
                    : 'border border-[var(--v33-accent)] bg-[color-mix(in_srgb,var(--v33-card)_72%,transparent)] text-[var(--v33-accent-strong)] backdrop-blur-xl'
              }`}
            >
              {badge}
            </span>
          )}

          <button
            onClick={handleWishlist}
            className={`nexora-card-wishlist absolute right-2.5 top-2.5 z-10 h-8 w-8 transition-all duration-300 sm:right-3 sm:top-3 sm:h-9 sm:w-9 ${
              inWishlist
                ? 'nexora-card-wishlist-active'
                : 'opacity-95 hover:text-[var(--v33-accent-strong)] sm:opacity-0 sm:group-hover:opacity-100'
            }`}
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-0 transition-transform duration-300 sm:translate-y-full sm:group-hover:translate-y-0">
            <button
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              className="w-full py-3.5 bg-[var(--v33-accent)] text-[var(--v33-text)] text-[10px] font-black tracking-[0.22em] uppercase flex items-center justify-center gap-2 hover:bg-[var(--v33-accent-strong)] hover:text-[#FFFDF8] transition-colors disabled:bg-[#17171a] disabled:text-[var(--v33-muted)]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {isSoldOut ? 'Unavailable' : 'Quick Add'}
            </button>
          </div>
        </div>

        <div className="relative z-[2] p-4 sm:p-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--v33-muted)]">
            {product.targetAudience || product.category} · {product.isCore ? (product.coreLabel || 'Core') : product.collection}
          </p>
          <h3 className="mb-3 line-clamp-1 text-sm font-bold text-[var(--v33-text)] transition-colors group-hover:text-[var(--v33-accent-strong)]">
            {product.name}
          </h3>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${isOnSale ? 'nexora-sale-price' : 'text-[var(--v33-text)]'}`}>
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-xs text-[var(--v33-muted)] line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
            {product.rating > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--v33-accent-strong)]"><Star className="h-3 w-3 fill-current" /> {product.rating.toFixed(1)}</span>
            ) : isLowStock ? (
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--v33-accent-strong)]">
                {totalStock} left
              </span>
            ) : null}
          </div>
          {product.colors.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--v33-border)] pt-3">
              <div className="flex items-center gap-1.5">
                {product.colors.slice(0, 5).map((color) => {
                  const value = typeof color === 'string' ? color : color.nameEn || color.name || color.nameAr || 'custom';
                  const hex = typeof color === 'string' ? undefined : color.hex;
                  return <span key={value} title={value} className="h-4 w-4 rounded-full border border-[var(--v33-border)] shadow-sm" style={{ background: hex || value }} />;
                })}
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--v33-subtle)]">{availableSizes.length} sizes</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
