import { getSupabaseAdmin } from "@/lib/supabase";
import type { AlertRule, Item, LatestPrice } from "@/lib/types";
import { ItemCard } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = getSupabaseAdmin();

  const [{ data: items }, { data: latestPrices }, { data: rules }] = await Promise.all([
    supabase.from("items").select("*").order("name").returns<Item[]>(),
    supabase.from("latest_prices").select("*").returns<LatestPrice[]>(),
    supabase
      .from("alert_rules")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<AlertRule[]>(),
  ]);

  const pricesByItem = new Map<string, { buy?: LatestPrice; sell?: LatestPrice }>();
  for (const p of latestPrices ?? []) {
    const entry = pricesByItem.get(p.item_id) ?? {};
    if (p.is_sell) entry.sell = p;
    else entry.buy = p;
    pricesByItem.set(p.item_id, entry);
  }

  const rulesByItem = new Map<string, AlertRule[]>();
  for (const rule of rules ?? []) {
    const list = rulesByItem.get(rule.item_id) ?? [];
    list.push(rule);
    rulesByItem.set(rule.item_id, list);
  }

  return (
    <>
      <p className="subtitle">
        Historique des prix et alertes d&apos;achat/vente par matériau. Une
        alerte Telegram part quand un prix franchit ton seuil, avec un délai
        minimum entre deux alertes pour la même règle.
      </p>

      {(items ?? []).map((item) => (
        <ItemCard
          key={item.id}
          itemId={item.id}
          itemName={item.name}
          buyPrice={pricesByItem.get(item.id)?.buy}
          sellPrice={pricesByItem.get(item.id)?.sell}
          rules={rulesByItem.get(item.id) ?? []}
        />
      ))}

      {(items ?? []).length === 0 && (
        <p className="muted">Aucun matériau configuré.</p>
      )}
    </>
  );
}
