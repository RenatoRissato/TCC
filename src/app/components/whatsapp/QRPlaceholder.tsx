export function QRPlaceholder() {
  return (
    <svg width={164} height={164} viewBox="0 0 164 164" className="rounded-xl">
      <rect width={164} height={164} fill="white" />
      <rect x={10}  y={10}  width={42} height={42} rx={5} fill="#212529" />
      <rect x={16}  y={16}  width={30} height={30} rx={2} fill="white" />
      <rect x={22}  y={22}  width={18} height={18} rx={1} fill="#212529" />
      <rect x={112} y={10}  width={42} height={42} rx={5} fill="#212529" />
      <rect x={118} y={16}  width={30} height={30} rx={2} fill="white" />
      <rect x={124} y={22}  width={18} height={18} rx={1} fill="#212529" />
      <rect x={10}  y={112} width={42} height={42} rx={5} fill="#212529" />
      <rect x={16}  y={118} width={30} height={30} rx={2} fill="white" />
      <rect x={22}  y={124} width={18} height={18} rx={1} fill="#212529" />
      {[62, 68, 74, 80, 86, 92, 98].map((x) =>
        [62, 68, 74, 80, 86, 92, 98].map((y) =>
          (x + y) % 14 < 7 ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={0.5} fill="#212529" />
          ) : null,
        ),
      )}
      <rect x={70} y={70} width={24} height={24} rx={7} fill="#FFC107" />
      <text x={82} y={88} textAnchor="middle" fontSize={14}>🚌</text>
    </svg>
  );
}
