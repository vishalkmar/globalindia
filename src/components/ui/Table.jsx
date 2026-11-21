import { cn } from "@/lib/utils";

/**
 * Data table for specifications, comparisons and product lists.
 * Zebra rows use the surface colour; columns marked `data: true` use the mono data font (CAS, %, MOQ).
 * Scrolls horizontally on small screens instead of squashing columns.
 *
 * @param {{
 *  columns: {key:string,label:string,data?:boolean,align?:'left'|'right',width?:string}[],
 *  rows: Record<string, import('react').ReactNode>[],
 *  caption?: string, note?: string, zebra?: boolean, className?: string
 * }} props
 */
export function Table({ columns, rows, caption, note, zebra = true, className }) {
  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div className="overflow-x-auto rounded-card border border-line" tabIndex={0} role="region" aria-label={caption ?? "Table"}>
        <table className="w-full min-w-[520px] border-collapse text-left text-[0.9375rem]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line bg-card">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "px-4 py-3 text-[0.75rem] font-bold tracking-[0.08em] text-muted uppercase",
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className={cn("border-b border-line last:border-b-0", zebra && i % 2 === 1 ? "bg-surface" : "bg-card")}>
                {columns.map((col, ci) => {
                  const Cell = ci === 0 ? "th" : "td";
                  return (
                    <Cell
                      key={col.key}
                      scope={ci === 0 ? "row" : undefined}
                      className={cn(
                        "px-4 py-3 align-top",
                        ci === 0 ? "font-semibold text-ink" : "text-ink",
                        col.data && "text-data",
                        col.align === "right" && "text-right",
                      )}
                    >
                      {row[col.key] ?? "—"}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <figcaption className="text-sm text-muted">{note}</figcaption> : null}
    </figure>
  );
}
