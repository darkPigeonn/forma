import { revalidatePath } from "next/cache";
import {
  expirePublicFormCache,
  revalidatePublicFormCache,
  type PublicFormCacheIdentity,
} from "@/lib/cache/public-form";

type PublicFormPathIdentity = PublicFormCacheIdentity & {
  publicPath?: string | null;
};

type RevalidatePublicFormOptions = {
  /** Route Handlers cannot call updateTag — use revalidateTag instead. */
  fromRouteHandler?: boolean;
};

/** Bust Next.js data cache for a public form page and related tags. */
export function revalidatePublicForm(
  identity: PublicFormPathIdentity,
  options?: RevalidatePublicFormOptions,
): void {
  if (options?.fromRouteHandler) {
    revalidatePublicFormCache(identity);
  } else {
    expirePublicFormCache(identity);
  }
  if (identity.publicPath) {
    revalidatePath(identity.publicPath);
  }
}
