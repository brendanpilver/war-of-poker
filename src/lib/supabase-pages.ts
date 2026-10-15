/**
 * Reading more rows than one request returns.
 *
 * Supabase's API caps every response at its "Max rows" setting -- 1,000 by
 * default -- whatever `.limit()` asks for, and says nothing when it does. A
 * dashboard that reads `.limit(50000)` therefore counts the first thousand
 * events and stops. This walks `.range()` pages until a short page, with a
 * hard ceiling so one call cannot read an unbounded table.
 *
 * `page` must apply a stable order (the primary key), or rows can repeat or
 * go missing between pages.
 */

const PAGE_SIZE = 1000;

export type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows: number,
): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, maxRows) - 1;
    const { data, error } = await page(from, to);
    if (error) return { rows, truncated: false, error: error.message };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < to - from + 1) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: true, error: null };
}
