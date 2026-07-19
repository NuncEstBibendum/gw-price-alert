import { PriceChart } from "@/components/PriceChart";
import { createRule, deleteRule, toggleRule } from "@/app/actions";
import type { AlertRule, LatestPrice } from "@/lib/types";

interface ItemCardProps {
  itemId: string;
  itemName: string;
  buyPrice: LatestPrice | undefined;
  sellPrice: LatestPrice | undefined;
  rules: AlertRule[];
}

function formatTs(ts: string | undefined): string {
  if (!ts) return "Pas encore de données";
  return (
    "Mis à jour " +
    new Date(ts).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
  );
}

export function ItemCard({ itemId, itemName, buyPrice, sellPrice, rules }: ItemCardProps) {
  const lastTs = [buyPrice?.ts, sellPrice?.ts].filter(Boolean).sort().pop();

  return (
    <div className="card item-card">
      <div className="item-card-header">
        <div>
          <h2>{itemName}</h2>
          <p className="muted small">{formatTs(lastTs)}</p>
        </div>
        <div className="price-badges">
          <span className="price-badge price-badge-buy">
            Achat<strong>{buyPrice ? `${buyPrice.price}g` : "—"}</strong>
          </span>
          <span className="price-badge price-badge-sell">
            Vente<strong>{sellPrice ? `${sellPrice.price}g` : "—"}</strong>
          </span>
        </div>
      </div>

      <PriceChart itemId={itemId} />

      <div className="rules-section">
        {rules.length > 0 && (
          <div className="rules-list">
            {rules.map((rule) => (
              <div key={rule.id} className={rule.enabled ? "rule-row" : "rule-row disabled"}>
                <span
                  className={`badge ${rule.type === "buy" ? "badge-buy" : "badge-sell"}`}
                >
                  {rule.type === "buy" ? "Achat" : "Vente"}
                </span>
                <span className="rule-threshold">
                  {rule.type === "buy" ? "≤" : "≥"} {rule.threshold}g
                </span>
                <span className="muted small">cooldown {rule.cooldown_minutes}min</span>
                <div className="rule-actions">
                  <form action={toggleRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="enabled" value={String(rule.enabled)} />
                    <button
                      type="submit"
                      className="icon-btn"
                      title={rule.enabled ? "Désactiver" : "Activer"}
                    >
                      {rule.enabled ? "⏸" : "▶"}
                    </button>
                  </form>
                  <form action={deleteRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <button type="submit" className="icon-btn danger" title="Supprimer">
                      ×
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="quick-add-row">
          <form action={createRule} className="quick-add quick-add-buy">
            <input type="hidden" name="item_id" value={itemId} />
            <input type="hidden" name="type" value="buy" />
            <span>Acheter sous</span>
            <input type="number" name="threshold" min={0} placeholder="prix" required />
            <span>g</span>
            <input
              type="number"
              name="cooldown_minutes"
              min={1}
              defaultValue={60}
              title="Cooldown (minutes)"
              required
            />
            <span>min</span>
            <button type="submit" title="Ajouter l'alerte">
              +
            </button>
          </form>

          <form action={createRule} className="quick-add quick-add-sell">
            <input type="hidden" name="item_id" value={itemId} />
            <input type="hidden" name="type" value="sell" />
            <span>Vendre au-dessus de</span>
            <input type="number" name="threshold" min={0} placeholder="prix" required />
            <span>g</span>
            <input
              type="number"
              name="cooldown_minutes"
              min={1}
              defaultValue={60}
              title="Cooldown (minutes)"
              required
            />
            <span>min</span>
            <button type="submit" title="Ajouter l'alerte">
              +
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
