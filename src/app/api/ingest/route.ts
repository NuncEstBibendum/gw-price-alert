import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchPriceHistory } from "@/lib/gwtoolbox";
import { evaluateAndTriggerAlerts } from "@/lib/alerts";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ITEM_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-cron-secret");
  const queryParam = req.nextUrl.searchParams.get("secret");
  return header === secret || queryParam === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .returns<Item[]>();

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const results: Record<string, { inserted: number; error?: string }> = {};

  for (const [index, item] of (items ?? []).entries()) {
    if (index > 0) {
      // Space out requests to gwtoolbox to avoid tripping its rate limit
      // when polling many items in one run.
      await sleep(ITEM_DELAY_MS);
    }

    try {
      const points = await fetchPriceHistory(item.id);

      const rows = points.map((point) => ({
        item_id: item.id,
        ts: new Date(point.t * 1000).toISOString(),
        price: point.p,
        is_sell: point.s === 1,
      }));

      if (rows.length === 0) {
        results[item.id] = { inserted: 0 };
        continue;
      }

      const { error: upsertError, count } = await supabase
        .from("prices")
        .upsert(rows, {
          onConflict: "item_id,ts,is_sell",
          ignoreDuplicates: true,
          count: "exact",
        });

      if (upsertError) {
        results[item.id] = { inserted: 0, error: upsertError.message };
        continue;
      }

      results[item.id] = { inserted: count ?? rows.length };
    } catch (err) {
      results[item.id] = {
        inserted: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  let alertsTriggered = 0;
  try {
    const alertResult = await evaluateAndTriggerAlerts(supabase);
    alertsTriggered = alertResult.triggered;
  } catch (err) {
    return NextResponse.json(
      {
        results,
        alertsError: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ results, alertsTriggered });
}
