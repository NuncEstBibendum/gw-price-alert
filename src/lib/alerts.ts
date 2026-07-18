import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "./telegram";
import type { AlertRule, LatestPrice } from "./types";

interface RuleWithItemName extends AlertRule {
  items: { name: string } | null;
}

function isConditionMet(rule: AlertRule, price: number): boolean {
  return rule.direction === "below" ? price <= rule.threshold : price >= rule.threshold;
}

function isCooldownElapsed(rule: AlertRule, now: Date): boolean {
  if (!rule.last_triggered_at) return true;
  const elapsedMinutes =
    (now.getTime() - new Date(rule.last_triggered_at).getTime()) / 60_000;
  return elapsedMinutes >= rule.cooldown_minutes;
}

function formatMessage(rule: RuleWithItemName, price: number): string {
  const itemName = rule.items?.name ?? rule.item_id;
  const action = rule.type === "buy" ? "Acheter" : "Vendre";
  const comparison = rule.direction === "below" ? "sous" : "au-dessus de";
  return (
    `*${action}* ${itemName}\n` +
    `Prix ${rule.type === "buy" ? "d'achat" : "de vente"} : *${price}g*\n` +
    `Seuil : ${comparison} ${rule.threshold}g`
  );
}

/**
 * Evaluates all enabled alert rules against the latest known prices and
 * sends Telegram alerts for the ones that just crossed their threshold and
 * are out of cooldown. Meant to run right after a price ingest.
 */
export async function evaluateAndTriggerAlerts(
  supabase: SupabaseClient,
): Promise<{ triggered: number }> {
  const now = new Date();

  const [{ data: rules, error: rulesError }, { data: latestPrices, error: pricesError }] =
    await Promise.all([
      supabase
        .from("alert_rules")
        .select("*, items(name)")
        .eq("enabled", true)
        .returns<RuleWithItemName[]>(),
      supabase.from("latest_prices").select("*").returns<LatestPrice[]>(),
    ]);

  if (rulesError) throw rulesError;
  if (pricesError) throw pricesError;

  const priceByKey = new Map<string, number>();
  for (const p of latestPrices ?? []) {
    priceByKey.set(`${p.item_id}:${p.is_sell}`, p.price);
  }

  let triggered = 0;

  for (const rule of rules ?? []) {
    const isSell = rule.type === "sell";
    const price = priceByKey.get(`${rule.item_id}:${isSell}`);
    if (price === undefined) continue;
    if (!isConditionMet(rule, price)) continue;
    if (!isCooldownElapsed(rule, now)) continue;

    await sendTelegramMessage(formatMessage(rule, price));

    const { error: updateError } = await supabase
      .from("alert_rules")
      .update({ last_triggered_at: now.toISOString() })
      .eq("id", rule.id);
    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from("alert_log")
      .insert({ rule_id: rule.id, price });
    if (logError) throw logError;

    triggered += 1;
  }

  return { triggered };
}
