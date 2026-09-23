/**
 * The cinematic banner behind the top of each page. Photos are from Unsplash (free license, no
 * attribution required); ids are Unsplash photo ids, served full-resolution through next/image.
 */
const PHOTOS = {
  alpine: "photo-1625647891375-91463187659f", // snow peaks at sunset
  alpineGlow: "photo-1603657523988-76184975d205", // ridges under an orange sky
  coast: "photo-1785861834949-1e4262249631", // cliffs over turquoise water
  palms: "photo-1672841828459-bc913fdcd995", // tropical beach, palms
  palmsBay: "photo-1567335991483-fc7088c63506", // palms over a clear bay
  pool: "photo-1622816951464-df6fc7ab2ced", // infinity pool facing the ocean
  villaSea: "photo-1783497607905-2ad168af9b4b", // modern house over the sea at sunset
  villaDusk: "photo-1760570273485-13d949dd3c98", // modern facade, mountains, sunset
  aerial: "photo-1533491759193-a5d9abc133d6", // aerial turquoise shoreline
  surf: "photo-1505896202-4fe971e982fa", // aerial surf over rocks
  palmSunset: "photo-1627294169003-44cbb1ec46f1", // palms reflected at sunset
} as const;

// Longest prefix wins, so /dashboard/meta/campaigns/new still gets the campaigns scene.
const ROUTES: [string, keyof typeof PHOTOS][] = [
  ["/dashboard/stores", "coast"],
  ["/dashboard/orders", "palms"],
  ["/dashboard/products", "palmsBay"],
  ["/dashboard/meta/campaigns", "pool"],
  ["/dashboard/campaigns", "pool"],
  ["/dashboard/customers", "surf"],
  ["/dashboard/analytics", "villaSea"],
  ["/dashboard/integrations", "aerial"],
  ["/dashboard/exceptions", "villaDusk"],
  ["/dashboard/team", "alpineGlow"],
  ["/billing", "palmSunset"],
  ["/dashboard", "alpine"],
];

export function sceneFor(pathname: string): string {
  const match = ROUTES.filter(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return unsplashUrl(PHOTOS[match?.[1] ?? "alpine"]);
}

export const LOGIN_SCENE = () => unsplashUrl(PHOTOS.alpine);

/** Base URL for the original; next/image appends its own width/quality, so the source stays full size. */
function unsplashUrl(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop`;
}
