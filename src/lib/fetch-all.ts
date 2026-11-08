/** Supabase caps a response at 1000 rows by default. Page explicitly so stats are never computed on a silent subset. */
export const MAX_ROWS = 10000;
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<{ rows: T[]; truncated: boolean; failed: boolean }> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; from < MAX_ROWS; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error || !data) return { rows, truncated: false, failed: true };
    rows.push(...data);
    if (data.length < size) return { rows, truncated: false, failed: false };
  }
  return { rows, truncated: true, failed: false };
}
