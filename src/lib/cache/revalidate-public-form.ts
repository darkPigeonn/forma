import { revalidatePath } from "next/cache";
import {
  revalidatePublicFormCache,
  type PublicFormCacheIdentity,
} from "@/lib/cache/public-form";

type PublicFormPathIdentity = PublicFormCacheIdentity & {
  publicPath?: string | null;
};

/** Bust Next.js data cache for a public form page and related tags. */
export function revalidatePublicForm(
  identity: PublicFormPathIdentity,
): void {
  revalidatePublicFormCache(identity);
  if (identity.publicPath) {
    revalidatePath(identity.publicPath);
  }
}
