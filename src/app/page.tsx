import { getSupabaseAdmin } from "@/lib/supabase";
import type { Item, LatestPrice } from "@/lib/types";
import { PriceChart } from "@/components/PriceChart";

export const dynamic = "force-dynamic";

function formatTs(ts: string | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function DashboardPage() {
  const supabase = getSupabaseAdmin();

  const [{ data: items }, { data: latestPrices }] = await Promise.all([
    supabase.from("items").select("*").order("name").returns<Item[]>(),
    supabase.from("latest_prices").select("*").returns<LatestPrice[]>(),
  ]);

  const byItem = new Map<string, { buy?: LatestPrice; sell?: LatestPrice }>();
  for (const p of latestPrices ?? []) {
    const entry = byItem.get(p.item_id) ?? {};
    if (p.is_sell) entry.sell = p;
    else entry.buy = p;
    byItem.set(p.item_id, entry);
  }

  return (
    <>
      <h1>Prix des matériaux</h1>
      <p className="subtitle">
        Derniers prix connus (mis à jour toutes les 5 minutes). Configure tes
        alertes dans <a href="/rules">Règles d&apos;alerte</a>.
      </p>

      <table>
        <thead>
          <tr>
            <th>Matériau</th>
            <th>Prix d&apos;achat</th>
            <th>Prix de vente</th>
            <th>Dernière mise à jour</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item) => {
            const prices = byItem.get(item.id);
            const lastTs = [prices?.buy?.ts, prices?.sell?.ts]
              .filter(Boolean)
              .sort()
              .pop();
            return (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="price-buy">
                  {prices?.buy ? `${prices.buy.price}g` : "—"}
                </td>
                <td className="price-sell">
                  {prices?.sell ? `${prices.sell.price}g` : "—"}
                </td>
                <td className="muted">{formatTs(lastTs)}</td>
              </tr>
            );
          })}
          {(items ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                Aucun matériau configuré.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Historique des prix</h2>
      {(items ?? []).map((item) => (
        <PriceChart key={item.id} itemId={item.id} itemName={item.name} />
      ))}
    </>
  );
}
