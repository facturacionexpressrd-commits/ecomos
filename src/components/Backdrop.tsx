import Image from "next/image";
import { LOGIN_SCENE } from "@/lib/scenery";
import { unsplashLoader } from "@/components/dashboard/HeroBanner";

/** Full-screen cinematic photo behind the standalone pages (sign-in, onboarding, invitations). */
export default function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <Image src={LOGIN_SCENE()} alt="" fill priority loader={unsplashLoader} quality={85} sizes="100vw" className="hero-in object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/55 to-ink/90" />
    </div>
  );
}
