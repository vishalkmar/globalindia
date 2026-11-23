import { cn } from "@/lib/utils";

/**
 * Data table for specifications, comparisons and product lists.
 * Clean rows with hairline dividers and a hover tint; `data: true` columns use tabular figures (CAS, %, MOQ).
 * Scrolls horizontally on small screens instead of squashing columns.
 *
 * @param {{
 *  columns: {key:string,label:string,data?:boolean,align?:'left'|'right',width?:string}[],
 *  rows: Record<string, import('react').ReactNode>[],
 *  caption?: string, note?: string, zebra?: boolean, className?: string,
 *  stackOnMobile?: boolean   // below 640 px each row becomes a card with column labels (no sideways scroll)
 * }} props
 */
export function Table({ columns, rows, caption, note, zebra = false, className, stackOnMobile = false }) {
  const stack = stackOnMobile;
  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div
        className="overflow-x-auto surface-card"
        tabIndex={0}
        role="region"
        aria-label={caption ?? "Table"}
      >
        <table
          className={cn(
            "w-full border-collapse text-left text-[0.9375rem]",
            stack ? "max-sm:block sm:min-w-[520px]" : "min-w-[520px]",
          )}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className={stack ? "max-sm:sr-only" : undefined}>
            <tr className="border-b border-hairline bg-[color-mix(in_oklab,var(--c-surface)_70%,var(--c-card))]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "px-5 py-3.5 text-[0.6875rem] font-bold tracking-[0.1em] text-muted uppercase",
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={stack ? "max-sm:block" : undefined}>
            {rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={cn(
                  "border-b border-hairline transition-colors duration-150 last:border-b-0 hover:bg-[color-mix(in_oklab,var(--c-primary)_4%,var(--c-card))]",
                  zebra && i % 2 === 1 ? "bg-surface" : "bg-card",
                  stack && "max-sm:block max-sm:py-2",
                )}
              >
                {columns.map((col, ci) => {
                  const Cell = ci === 0 ? "th" : "td";
                  return (
                    <Cell
                      key={col.key}
                      scope={ci === 0 ? "row" : undefined}
                      data-label={stack && ci > 0 ? col.label : undefined}
                      className={cn(
                        "px-5 py-3.5 align-top",
                        stack && "max-sm:block max-sm:py-1.5",
                        stack &&
                          ci > 0 &&
                          "max-sm:before:mb-0.5 max-sm:before:block max-sm:before:text-[0.6875rem] max-sm:before:font-bold max-sm:before:tracking-[0.08em] max-sm:before:text-muted max-sm:before:uppercase max-sm:before:content-[attr(data-label)]",
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
