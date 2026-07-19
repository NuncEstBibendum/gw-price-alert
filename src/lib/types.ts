export interface Item {
  id: string;
  name: string;
}

export interface LatestPrice {
  item_id: string;
  is_sell: boolean;
  price: number;
  ts: string;
}

export type AlertType = "buy" | "sell";

export interface AlertRule {
  id: string;
  item_id: string;
  type: AlertType;
  threshold: number;
  cooldown_minutes: number;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
}
