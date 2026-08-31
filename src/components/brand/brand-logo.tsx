import Image from "next/image";
import Link from "next/link";
import { ui } from "@/lib/ui-id";

export const LOGO_SRC = "/logo.png";

const SIZES = {
  sm: { height: 36, width: 36, className: "h-9 w-auto" },
  md: { height: 44, width: 44, className: "h-11 w-auto" },
  lg: { height: 56, width: 56, className: "h-14 w-auto" },
  hero: { height: 80, width: 80, className: "h-16 w-auto sm:h-20" },
} as const;

type BrandLogoProps = {
  href?: string | null;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  layout?: "inline" | "stacked";
  wordmarkClassName?: string;
  priority?: boolean;
  className?: string;
};

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  layout = "inline",
  wordmarkClassName,
  priority = false,
  className,
}: BrandLogoProps) {
  const dims = SIZES[size];
  const isStacked = layout === "stacked";

  const mark = (
    <span
      className={`inline-flex min-w-0 ${
        isStacked ? "flex-col items-start gap-2" : "items-center gap-2.5"
      } ${className ?? ""}`}
    >
      <Image
        src={LOGO_SRC}
        alt=""
        width={dims.width}
        height={dims.height}
        priority={priority}
        className={`${dims.className} shrink-0 object-contain`}
      />
      {showWordmark ? (
        <span
          className={`min-w-0 font-[family-name:var(--font-fraunces)] font-semibold leading-tight text-ink ${
            size === "hero"
              ? "text-4xl sm:text-5xl lg:text-6xl"
              : size === "lg"
                ? "text-2xl sm:text-3xl"
                : size === "sm"
                  ? "text-lg"
                  : "text-xl"
          } ${wordmarkClassName ?? ""}`}
        >
          {ui.brand}
        </span>
      ) : (
        <span className="sr-only">{ui.brand}</span>
      )}
    </span>
  );

  if (!href) {
    return mark;
  }

  return (
    <Link
      href={href}
      className="inline-flex min-w-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      aria-label={ui.brand}
    >
      {mark}
    </Link>
  );
}
