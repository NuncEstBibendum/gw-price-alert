// gwtoolbox pricing_history returns points for both buy and sell listings,
// most recent first. `s: 1` marks a sell price; its absence marks a buy price.
export interface RawPricePoint {
  t: number; // unix seconds
  p: number; // price in gold
  m: string; // item code
  s?: 1;
}

const BASE_URL = "https://kamadan.gwtoolbox.com/pricing_history";
const LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000; // 3 days is plenty given 5-minute polling

export async function fetchPriceHistory(
  itemCode: string,
): Promise<RawPricePoint[]> {
  const to = Date.now();
  const from = to - LOOKBACK_MS;
  const url = `${BASE_URL}/${itemCode}/${from}/${to}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `gwtoolbox request failed for ${itemCode}: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as RawPricePoint[];
  return data;
}
