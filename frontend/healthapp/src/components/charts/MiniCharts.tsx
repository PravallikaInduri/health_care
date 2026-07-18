/* =====================================================================
   Lightweight inline-SVG chart primitives — no external dependencies.
   Used by the patient/admin dashboards to render trend visuals.
====================================================================== */

interface AreaChartProps {
  /** Numeric series, evenly spaced (one point per period). */
  data: number[];
  /** Pixel height — width is responsive (100%). */
  height?: number;
  /** Stroke + fill colour. Defaults to azure-500. */
  color?: string;
  /** Optional category labels rendered under each tick. */
  labels?: string[];
}

/** Smooth area / line chart with gradient fill (sparkline-style). */
export const AreaChart = ({
  data,
  height = 120,
  color = "#0EA5E9",
  labels,
}: AreaChartProps) => {
  if (data.length === 0) data = [0];

  const w = 600;
  const h = height;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = labels ? 22 : 8;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);

  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  /* Monotone Cubic interpolation for a soft, modern curve */
  const path =
    points.length === 1
      ? `M${points[0].x},${points[0].y}`
      : points
          .map((p, i) => {
            if (i === 0) return `M${p.x},${p.y}`;
            const prev = points[i - 1];
            const cx = (prev.x + p.x) / 2;
            return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
          })
          .join(" ");

  const areaPath = `${path} L${points[points.length - 1].x},${padT + innerH} L${
    points[0].x
  },${padT + innerH} Z`;

  const gradId = `area-grad-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="trend chart"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Endpoint dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={4}
          fill={color}
        />
      )}

      {labels && labels.length === data.length && (
        <g>
          {labels.map((lbl, i) => (
            <text
              key={i}
              x={padL + i * stepX}
              y={h - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {lbl}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
};

interface BarChartProps {
  data: number[];
  height?: number;
  color?: string;
  labels?: string[];
}

/** Simple rounded bar chart. */
export const BarChart = ({
  data,
  height = 120,
  color = "#0EA5E9",
  labels,
}: BarChartProps) => {
  if (data.length === 0) data = [0];

  const w = 600;
  const h = height;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = labels ? 22 : 8;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const max = Math.max(...data, 1);
  const barGap = 8;
  const barW = Math.max(2, (innerW - barGap * (data.length - 1)) / data.length);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="bar chart"
    >
      {data.map((v, i) => {
        const barH = (v / max) * innerH;
        const x = padL + i * (barW + barGap);
        const y = padT + innerH - barH;
        return (
          <g key={i}>
            {/* track */}
            <rect
              x={x}
              y={padT}
              width={barW}
              height={innerH}
              rx={4}
              fill="#F1F5F9"
            />
            {/* bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={color}
            />
          </g>
        );
      })}

      {labels && labels.length === data.length && (
        <g>
          {labels.map((lbl, i) => (
            <text
              key={i}
              x={padL + i * (barW + barGap) + barW / 2}
              y={h - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {lbl}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
};

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  /** Center value shown in the hole (e.g. total). */
  centerLabel?: string;
  centerSublabel?: string;
}

/** Donut / ring chart with legend. */
export const DonutChart = ({
  segments,
  size = 140,
  centerLabel,
  centerSublabel,
}: DonutChartProps) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const filtered = segments.filter((s) => s.value > 0);

  return (
    <div className="flex items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="flex-shrink-0"
        role="img"
        aria-label="distribution chart"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={16}
        />
        {total > 0 &&
          filtered.map((seg, i) => {
            const portion = seg.value / total;
            const dash = portion * circumference;
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={16}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += dash;
            return el;
          })}

        {centerLabel && (
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fill="#0F172A"
          >
            {centerLabel}
          </text>
        )}
        {centerSublabel && (
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
          >
            {centerSublabel}
          </text>
        )}
      </svg>

      <ul className="text-xs space-y-2 min-w-0">
        {segments.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-2 min-w-0"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-slate-600 truncate min-w-0">
              {s.label}
            </span>
            <span className="ml-auto font-semibold text-slate-800 tabular-nums">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
