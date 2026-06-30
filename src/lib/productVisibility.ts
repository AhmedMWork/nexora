import type { Product } from '@/types';

export type AudienceValue = 'men' | 'women' | 'unisex' | 'all';

const VALID_AUDIENCES = new Set<AudienceValue>(['men', 'women', 'unisex', 'all']);
const CORE_LABELS = new Set(['core', 'core essential', 'core essentials', 'core collection']);

export function normalizeAudienceValue(value?: unknown): AudienceValue {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_AUDIENCES.has(normalized as AudienceValue) ? normalized as AudienceValue : 'unisex';
}

export function getProductAudience(product: Pick<Product, 'targetAudience' | 'gender' | 'category'>): AudienceValue {
  return normalizeAudienceValue(product.targetAudience || product.gender || product.category);
}

export function productMatchesAudience(product: Pick<Product, 'targetAudience' | 'gender' | 'category'>, category?: string): boolean {
  if (!category) return true;
  const target = String(category).trim().toLowerCase();
  const audience = getProductAudience(product);

  if (target === 'men') return audience === 'men' || audience === 'unisex' || audience === 'all';
  if (target === 'women') return audience === 'women' || audience === 'unisex' || audience === 'all';
  if (target === 'unisex') return audience === 'unisex' || audience === 'all';
  return product.category === target || audience === target;
}

export function getCoreDisplayLabel(product: Pick<Product, 'isCore' | 'coreLabel' | 'collection'>): string | null {
  if (!product.isCore) return null;
  const label = String(product.coreLabel || '').trim();
  if (label) return label;
  const collection = String(product.collection || '').trim();
  if (collection && CORE_LABELS.has(collection.toLowerCase())) return 'Core';
  return collection || 'Core';
}

export function getCollectionDisplayLabel(product: Pick<Product, 'isCore' | 'coreLabel' | 'collection' | 'isDrop' | 'isLimitedDrop' | 'dropLabel' | 'isPromotion' | 'promotionLabel'>): string | null {
  const core = getCoreDisplayLabel(product);
  if (core) return core;
  if (product.isDrop || product.isLimitedDrop) return product.dropLabel || 'Limited Drop';
  if (product.isPromotion) return product.promotionLabel || 'Promotion';

  const collection = String(product.collection || '').trim();
  if (!collection || CORE_LABELS.has(collection.toLowerCase())) return null;
  return collection;
}

function toMillis(value: unknown, fallback: number): number {
  if (!value) return fallback;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const parsed = new Date(value as string | number).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isProductLiveDrop(product: Product): boolean {
  if (product.status && !['active', 'sold_out'].includes(product.status)) return false;
  if (!(product.isDrop || product.isLimitedDrop)) return false;
  const now = Date.now();
  const start = toMillis(product.dropStartAt, 0);
  const end = toMillis(product.dropEndAt, Infinity);
  return now >= start && now <= end;
}

export function isProductLimitedSurface(product: Product): boolean {
  if (isProductLiveDrop(product)) return true;
  const text = `${product.category || ''} ${product.collection || ''} ${product.dropLabel || ''} ${product.promotionLabel || ''}`.toLowerCase();
  return Boolean(product.isLimitedDrop || product.isDrop || text.includes('limited'));
}
