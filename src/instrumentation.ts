// Next.js calls this for every error the app doesn't handle itself (a crashed page or route).
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routeType: string }
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("@/lib/alerts");
  await reportError(error, { where: `${request.method} ${request.path}`, routeType: context.routeType });
}
