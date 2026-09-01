import { revalidateTag, unstable_cache } from "next/cache";

const CACHE_KEY_PREFIX = "public-form";

export function publicFormCacheTagForSlug(slug: string): string {
  return `${CACHE_KEY_PREFIX}:slug:${slug.trim()}`;
}

export type PublicFormCacheIdentity = {
  id: string;
  slug?: string | null;
  shortCode?: string | null;
};

/** Invalidate cached public form payloads for all known URL segments. */
export function revalidatePublicFormCache(
  identity: PublicFormCacheIdentity,
): void {
  for (const segment of [identity.slug, identity.shortCode]) {
    if (segment?.trim()) {
      revalidateTag(publicFormCacheTagForSlug(segment));
    }
  }
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
