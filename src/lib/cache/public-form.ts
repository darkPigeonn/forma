import { revalidateTag, unstable_cache, updateTag } from "next/cache";

const CACHE_KEY_PREFIX = "public-form";

export function publicFormCacheTagForSlug(slug: string): string {
  return `${CACHE_KEY_PREFIX}:slug:${slug.trim()}`;
}

export type PublicFormCacheIdentity = {
  id: string;
  slug?: string | null;
  shortCode?: string | null;
};

function forEachPublicFormCacheTag(
  identity: PublicFormCacheIdentity,
  apply: (tag: string) => void,
): void {
  for (const segment of [identity.slug, identity.shortCode]) {
    if (segment?.trim()) {
      apply(publicFormCacheTagForSlug(segment));
    }
  }
}

/** Immediate expiry — use from Server Actions (read-your-own-writes). */
export function expirePublicFormCache(identity: PublicFormCacheIdentity): void {
  forEachPublicFormCacheTag(identity, updateTag);
}

/** Stale-while-revalidate — use from Route Handlers. */
export function revalidatePublicFormCache(
  identity: PublicFormCacheIdentity,
): void {
  forEachPublicFormCacheTag(identity, (tag) => revalidateTag(tag, "max"));
}

export function getCachedPublicFormBySlug<T>(
  slug: string,
  loader: () => Promise<T>,
): Promise<T> {
  const normalized = slug.trim();
  return unstable_cache(loader, [CACHE_KEY_PREFIX, normalized], {
    tags: [publicFormCacheTagForSlug(normalized)],
  })();
}
