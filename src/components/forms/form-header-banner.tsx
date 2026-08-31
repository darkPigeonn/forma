import type { FormHeaderImageMeta } from "@/lib/storage/form-header";

type FormHeaderBannerProps = {
  headerImage: FormHeaderImageMeta | null;
  themeHeaderColor: string;
  title: string;
};

export function FormHeaderBanner({
  headerImage,
  themeHeaderColor,
  title,
}: FormHeaderBannerProps) {
  if (headerImage?.url) {
    return (
      <div className="relative w-full overflow-hidden bg-bg-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={headerImage.url}
          alt=""
          className="h-40 w-full object-cover sm:h-52"
          role="presentation"
        />
        <span className="sr-only">{title}</span>
      </div>
    );
  }

  return (
    <div
      className="h-3 w-full"
      style={{ backgroundColor: themeHeaderColor }}
      aria-hidden="true"
    />
  );
}
