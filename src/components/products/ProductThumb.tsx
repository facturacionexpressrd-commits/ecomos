import Image, { type ImageLoader } from "next/image";
import { Boxes } from "lucide-react";

// Shopify's CDN resizes via ?width=, so thumbnails load small and sharp without Vercel's optimizer.
const shopifyLoader: ImageLoader = ({ src, width }) => `${src}${src.includes("?") ? "&" : "?"}width=${width}`;

/** Reads the product's main image from the raw Shopify payload stored at sync time. */
export function productImageUrl(raw: unknown): string | null {
  const url = (raw as { featuredMedia?: { preview?: { image?: { url?: string } | null } | null } | null })?.featuredMedia
    ?.preview?.image?.url;
  return typeof url === "string" && url.startsWith("https://cdn.shopify.com/") ? url : null;
}

export default function ProductThumb({ raw, size = 44 }: { raw: unknown; size?: number }) {
  const url = productImageUrl(raw);
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white/5"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} loader={shopifyLoader} className="object-cover" />
      ) : (
        <Boxes size={size * 0.4} className="text-faint" strokeWidth={1.5} />
      )}
    </span>
  );
}
