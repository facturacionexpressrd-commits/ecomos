/**
 * Only same-origin relative paths may be used as a post-login destination; anything else would be
 * an open redirect. "//host" and "/\host" are treated by browsers as another site, so both are out.
 */
export function safePath(value: string | null | undefined, fallback = "/dashboard") {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}
