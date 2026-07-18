import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Period = "week" | "month" | "year" | "all";

const PERIOD_MS: Record<Exclude<Period, "all">, number> = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

// Points get bucketed (averaged) so the chart stays smooth and the payload
// small regardless of how much history has accumulated for a period.
const MAX_BUCKETS = 150;
const MIN_BUCKET_MS = 30 * 60 * 1000;

interface PriceRow {
  ts: string;
  price: number;
  is_sell: boolean;
}

interface Bucket {
  bucketStart: number;
  buySum: number;
  buyCount: number;
  sellSum: number;
  sellCount: number;
}

function parsePeriod(value: string | null): Period {
  if (value === "week" || value === "month" || value === "year" || value === "all") {
    return value;
  }
  return "month";
}

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("item");
  const period = parsePeriod(req.nextUrl.searchParams.get("period"));

  if (!itemId) {
    return NextResponse.json({ error: "missing item query param" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("prices")
    .select("ts, price, is_sell")
    .eq("item_id", itemId)
    .order("ts", { ascending: true });

  if (period !== "all") {
    const fromIso = new Date(Date.now() - PERIOD_MS[period]).toISOString();
    query = query.gte("ts", fromIso);
  }

  const { data, error } = await query.returns<PriceRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const firstRow = data?.[0];
  const lastRow = data?.[data.length - 1];

  if (!data || !firstRow || !lastRow) {
    return NextResponse.json({ points: [] });
  }

  const firstTs = new Date(firstRow.ts).getTime();
  const lastTs = new Date(lastRow.ts).getTime();
  const rangeMs = Math.max(lastTs - firstTs, 1);
  const bucketMs = Math.max(rangeMs / MAX_BUCKETS, MIN_BUCKET_MS);

  const buckets = new Map<number, Bucket>();

  for (const row of data) {
    const t = new Date(row.ts).getTime();
    const bucketKey = Math.floor((t - firstTs) / bucketMs);
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        bucketStart: firstTs + bucketKey * bucketMs,
        buySum: 0,
        buyCount: 0,
        sellSum: 0,
        sellCount: 0,
      };
      buckets.set(bucketKey, bucket);
    }
    if (row.is_sell) {
      bucket.sellSum += row.price;
      bucket.sellCount += 1;
    } else {
      bucket.buySum += row.price;
      bucket.buyCount += 1;
    }
  }

  const points = Array.from(buckets.values())
    .sort((a, b) => a.bucketStart - b.bucketStart)
    .map((b) => ({
      ts: b.bucketStart,
      buy: b.buyCount > 0 ? Math.round(b.buySum / b.buyCount) : null,
      sell: b.sellCount > 0 ? Math.round(b.sellSum / b.sellCount) : null,
    }));

  return NextResponse.json({ points });
}
