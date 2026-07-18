-- Materials tracked for pricing (gwtoolbox item codes)
create table items (
  id text primary key, -- gwtoolbox item code, e.g. '0b03a4'
  name text not null,
  created_at timestamptz not null default now()
);

-- Raw price history points pulled from gwtoolbox
create table prices (
  id bigserial primary key,
  item_id text not null references items(id) on delete cascade,
  ts timestamptz not null,
  price integer not null,
  is_sell boolean not null default false,
  created_at timestamptz not null default now(),
  unique (item_id, ts, is_sell)
);

create index prices_item_ts_idx on prices (item_id, is_sell, ts desc);

-- Latest known buy/sell price per item, kept cheap to query for the dashboard and alert evaluation
create view latest_prices as
select distinct on (item_id, is_sell)
  item_id,
  is_sell,
  price,
  ts
from prices
order by item_id, is_sell, ts desc;

create type alert_type as enum ('buy', 'sell');
create type alert_direction as enum ('above', 'below');

-- User-configured thresholds. 'buy' + 'below' => alert when the buy price drops below threshold (good time to buy).
-- 'sell' + 'above' => alert when the sell price rises above threshold (good time to sell).
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references items(id) on delete cascade,
  type alert_type not null,
  direction alert_direction not null,
  threshold integer not null,
  cooldown_minutes integer not null default 60,
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create index alert_rules_item_idx on alert_rules (item_id);

-- History of alerts actually sent, for auditing
create table alert_log (
  id bigserial primary key,
  rule_id uuid not null references alert_rules(id) on delete cascade,
  price integer not null,
  triggered_at timestamptz not null default now()
);

-- Seed the three materials mentioned in the initial request
insert into items (id, name) values
  ('0b03a2', 'Ecto'),
  ('0b039b', 'Monstrous Claw'),
  ('0b03a4', 'Monstrous Fang');
