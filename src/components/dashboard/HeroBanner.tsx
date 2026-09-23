"use client";

import Image, { type ImageLoader } from "next/image";
import { usePathname } from "next/navigation";
import { sceneFor } from "@/lib/scenery";

// Unsplash's CDN resizes on its side, so each screen gets a crisp copy at its own width and pixel density.
export const unsplashLoader: ImageLoader = ({ src, width, quality }) => `${src}&w=${width}&q=${quality ?? 80}`;

/** The cinematic photo behind the top of every page; page titles and the first cards sit over its lower half. */
export default function HeroBanner() {
  const src = sceneFor(usePathname());
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden rounded-3xl [mask-image:linear-gradient(to_bottom,black_55%,transparent)] lg:h-96"
      aria-hidden
    >
      <Image
        key={src}
        src={src}
        alt=""
        fill
        priority
        loader={unsplashLoader}
        quality={85}
        sizes="(min-width: 1024px) calc(100vw - 7rem), 100vw"
        className="hero-in object-cover"
      />
      {/* Grade toward the palette and fade into the page, so text over it keeps contrast. */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/5 via-ink/25 to-ink/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-transparent to-transparent" />
    </div>
  );
}
