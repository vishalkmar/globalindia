/**
 * Small server-rendered charts for the admin dashboard (Phase 16 todo 01). Single series each, so no
 * legend: the title names it. Thin bars with 4px rounded data-ends on a recessive grid, a native
 * hover tooltip (<title>) per bar, the peak labelled directly, and a table for screen readers.
 */

const fmt = (n) => new Intl.NumberFormat("en-IN").format(n);

/** Vertical bars over time, e.g. enquiries per week. @param {{ data: { label: string, value: number }[], title: string, unit: string }} props */
export function WeekBars({ data, title, unit }) {
  const W = 640;
  const H = 200;
  const pad = { top: 24, right: 8, bottom: 28, left: 32 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const step = plotW / data.length;
  const bar = Math.min(28, step - 6);
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const y = (v) => pad.top + plotH - (v / nice) * plotH;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title}. Highest: ${fmt(data[peak]?.value ?? 0)} ${unit} in the week of ${data[peak]?.label}.`}
      >
        {[0, nice / 2, nice].map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--c-line)"
              strokeWidth="1"
            />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--c-muted)">
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * step + (step - bar) / 2;
          const h = Math.max(d.value ? 2 : 0, (d.value / nice) * plotH);
          const top = pad.top + plotH - h;
          const r = Math.min(4, h / 2, bar / 2);
          return (
            <g key={d.label}>
              {/* wide invisible hit target with the tooltip */}
              <rect x={pad.left + i * step} y={pad.top} width={step} height={plotH} fill="transparent">
                <title>{`Week of ${d.label}: ${fmt(d.value)} ${unit}`}</title>
              </rect>
              {h > 0 ? (
                <path
                  d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + bar - r} Q${x + bar},${top} ${x + bar},${top + r} V${top + h} Z`}
                  fill="var(--c-primary)"
                  pointerEvents="none"
                />
              ) : null}
              {i === peak && d.value ? (
                <text
                  x={x + bar / 2}
                  y={top - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="var(--c-ink)"
                >
                  {fmt(d.value)}
                </text>
              ) : null}
              {i % 2 === 0 || data.length <= 8 ? (
                <text x={x + bar / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--c-muted)">
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars (top products). The value is printed in text ink beside every bar. */
export function RankBars({ data, title, unit }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
      <ol className="flex flex-col gap-2.5">
        {data.map((d) => (
          <li
            key={d.label}
            className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm"
            title={`${d.label}: ${fmt(d.value)} ${unit}`}
          >
            <span className="truncate text-ink">{d.label}</span>
            <span
              className="h-2.5 rounded-r-[4px] bg-primary"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
              aria-hidden="true"
            />
            <span className="font-data text-[0.8125rem] text-muted tabular-nums">
              {fmt(d.value)} <span className="sr-only">{unit}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
