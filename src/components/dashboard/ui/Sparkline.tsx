/** A featherweight inline-SVG line chart — no charting dependency for a single trend line. */
export function Sparkline({
  points,
  width = 640,
  height = 160,
  color = "var(--teal)",
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-faint">
        Not enough data yet
      </div>
    );
  }

  const max = Math.max(...points, 0);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const pad = 8;
  const step = (width - pad * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (p - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${height - pad} L${pad},${height - pad} Z`;
  const gradientId = "spark-fill";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 3.5 : 0} fill={color} />
      ))}
    </svg>
  );
}
