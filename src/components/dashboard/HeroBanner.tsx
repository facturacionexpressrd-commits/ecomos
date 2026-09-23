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
    // Tall, and fully visible for most of its height: the photo carries on behind the first rows of
    // glass cards and only fades out near its bottom edge.
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] overflow-hidden rounded-3xl [mask-image:linear-gradient(to_bottom,black_78%,transparent)] lg:h-[38rem]"
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
      {/* A light grade only: a soft shade on the left where the page title sits, and a gentle
          darkening toward the bottom. Cards read over it through their own frosted glass. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/10 to-ink/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-ink/10 to-transparent" />
    </div>
  );
}
