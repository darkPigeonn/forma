import { headers } from "next/headers";

/** Request origin for absolute public URLs (SSR-safe). */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";

  const forwardedProto = h.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}
