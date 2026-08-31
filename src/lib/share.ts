export function publicFormUrl(publicPath: string, origin?: string): string {
  const base = origin?.replace(/\/$/, "");
  if (base) return `${base}${publicPath}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${publicPath}`;
  }
  return publicPath;
}

export function whatsappShareCaption(input: {
  title: string;
  description?: string;
  url: string;
}): string {
  const desc = input.description?.trim();
  const lines = [input.title.trim() || "Formulir"];
  if (desc) {
    lines.push("", desc.length > 180 ? `${desc.slice(0, 177)}…` : desc);
  }
  lines.push("", "Isi formulir:", input.url);
  return lines.join("\n");
}

export function whatsappShareHref(caption: string): string {
  return `https://wa.me/?text=${encodeURIComponent(caption)}`;
}
