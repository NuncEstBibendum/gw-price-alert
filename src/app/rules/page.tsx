import { getSupabaseAdmin } from "@/lib/supabase";
import type { AlertRule, Item } from "@/lib/types";
import { createRule, deleteRule, toggleRule } from "./actions";

export const dynamic = "force-dynamic";

function ruleLabel(rule: AlertRule): string {
  const action = rule.type === "buy" ? "Achat" : "Vente";
  const comparison = rule.direction === "below" ? "sous" : "au-dessus de";
  return `${action} ${comparison} ${rule.threshold}g`;
}

export default async function RulesPage() {
  const supabase = getSupabaseAdmin();

  const [{ data: items }, { data: rules }] = await Promise.all([
    supabase.from("items").select("*").order("name").returns<Item[]>(),
    supabase
      .from("alert_rules")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<AlertRule[]>(),
  ]);

  const itemNameById = new Map((items ?? []).map((i) => [i.id, i.name]));

  return (
    <>
      <h1>Règles d&apos;alerte</h1>
      <p className="subtitle">
        Configure les seuils de prix d&apos;achat/vente par matériau. Une
        alerte Telegram est envoyée quand le seuil est franchi, avec un délai
        minimum (cooldown) entre deux alertes pour la même règle.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Nouvelle règle</h2>
        <form className="rule-form" action={createRule}>
          <label>
            Matériau
            <select name="item_id" required>
              {(items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type
            <select name="type" required>
              <option value="buy">Prix d&apos;achat</option>
              <option value="sell">Prix de vente</option>
            </select>
          </label>

          <label>
            Condition
            <select name="direction" required>
              <option value="below">Descend sous</option>
              <option value="above">Monte au-dessus de</option>
            </select>
          </label>

          <label>
            Seuil (or)
            <input type="number" name="threshold" min={0} required />
          </label>

          <label>
            Cooldown (min)
            <input
              type="number"
              name="cooldown_minutes"
              min={1}
              defaultValue={60}
              required
            />
          </label>

          <button type="submit">Ajouter</button>
        </form>
      </div>

      <h2>Règles actives</h2>
      <table>
        <thead>
          <tr>
            <th>Matériau</th>
            <th>Règle</th>
            <th>Cooldown</th>
            <th>Statut</th>
            <th>Dernière alerte</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(rules ?? []).map((rule) => (
            <tr key={rule.id}>
              <td>{itemNameById.get(rule.item_id) ?? rule.item_id}</td>
              <td>{ruleLabel(rule)}</td>
              <td className="muted">{rule.cooldown_minutes} min</td>
              <td>
                <span
                  className={`badge ${
                    rule.enabled ? "badge-enabled" : "badge-disabled"
                  }`}
                >
                  {rule.enabled ? "Active" : "Désactivée"}
                </span>
              </td>
              <td className="muted">
                {rule.last_triggered_at
                  ? new Date(rule.last_triggered_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—"}
              </td>
              <td className="actions-cell">
                <form action={toggleRule}>
                  <input type="hidden" name="id" value={rule.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={String(rule.enabled)}
                  />
                  <button type="submit" className="secondary">
                    {rule.enabled ? "Désactiver" : "Activer"}
                  </button>
                </form>
                <form action={deleteRule}>
                  <input type="hidden" name="id" value={rule.id} />
                  <button type="submit" className="danger">
                    Supprimer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {(rules ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Aucune règle configurée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
