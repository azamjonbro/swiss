import type { Watch, WatchSibling, WatchVariant } from '@/types/models';

/**
 * Helpers for reading a grouped listing row.
 *
 * The API returns one row per model (`group=model`): the cheapest colourway,
 * with the rest of the run attached as `siblings`. Everything the grid does —
 * the swatches on a card, the "from" price, and every facet in the filter
 * drawer — has to look at the whole model rather than at the one colourway that
 * happened to represent it, or a filter would hide a model because its cheapest
 * colourway is quartz while the green one the visitor wanted is automatic.
 *
 * All of it degrades to a single-product read when `siblings` is absent, which
 * is what an ungrouped response (the admin listing, a brand preview strip)
 * returns — so the same components work either way.
 */

/** The facet-bearing fields shared by a representative and its siblings. */
export interface ModelMember {
  price: number;
  movement?: string;
  availability?: string;
  gender?: string;
  isNewArrival?: boolean;
  collectionRef?: string;
  variants: WatchVariant[];
}

/** `collectionRef` arrives either populated or as a bare id, depending on the endpoint. */
function refId(ref: unknown): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ((ref as { _id?: string })._id ?? '');
}

function asMember(source: Watch | WatchSibling): ModelMember {
  return {
    price: source.price,
    movement: source.movement,
    availability: source.availability,
    gender: source.gender,
    isNewArrival: source.isNewArrival,
    collectionRef: refId(source.collectionRef),
    variants: source.variants ?? [],
  };
}

/** Every colourway this row stands for — the representative included. */
export function modelMembers(watch: Watch): ModelMember[] {
  const members = [asMember(watch)];
  for (const sibling of watch.siblings ?? []) members.push(asMember(sibling));
  return members;
}

/** How many colourways the model has. 1 means the card speaks for one product. */
export function modelSize(watch: Watch): number {
  return 1 + (watch.siblings?.length ?? 0);
}

/**
 * Every colour in the model, in price order, deduplicated by slug.
 *
 * Deduplication is not cosmetic: Tissot lists five different PRX 40mm as
 * "Blue" — quartz and automatic, steel and gold — and five identical dots
 * would read as a rendering bug rather than as a colour range.
 */
export function modelColors(watch: Watch): WatchVariant[] {
  const seen = new Map<string, WatchVariant>();
  for (const member of modelMembers(watch)) {
    for (const variant of member.variants) {
      if (variant.colorSlug && !seen.has(variant.colorSlug)) seen.set(variant.colorSlug, variant);
    }
  }
  return [...seen.values()];
}

/** Cheapest and dearest colourway. Equal when the model is priced as one. */
export function modelPriceRange(watch: Watch): { min: number; max: number } {
  const prices = modelMembers(watch).map((m) => m.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
