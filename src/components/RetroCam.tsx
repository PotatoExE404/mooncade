export function RetroCam({ size = 24, className = "" }: { size?: number; className?: string }) {
  const px: [number, number, number, number, string][] = [
    [3, 4, 4, 2, "#2a2218"], [1, 6, 14, 8, "#2a2218"], [2, 7, 12, 6, "#b9b2a3"], [2, 7, 12, 1, "#e8e2d4"],
    [6, 7, 6, 6, "#2a2218"], [7, 8, 4, 4, "#3a6fd8"], [8, 9, 1, 1, "#cfe2ff"], [12, 7, 1, 1, "#e0453a"], [3, 9, 2, 1, "#2a2218"],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}
