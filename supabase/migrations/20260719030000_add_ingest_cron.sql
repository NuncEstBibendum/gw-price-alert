-- Replaces the GitHub Actions schedule (unreliable at 5-minute granularity)
-- with pg_cron running inside Postgres, which fires on time. The cron job
-- calls /api/ingest via pg_net and reads the shared secret from Vault so it
-- never has to live in a committed file.
--
-- One-time manual step required before (or after) this migration, run once
-- in the Supabase SQL editor — do NOT commit the real secret value:
--
--   select vault.create_secret('<your CRON_SECRET value>', 'cron_secret');
--
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'poll-gw-prices',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://gw-price-alert.vercel.app/api/ingest',
    headers := jsonb_build_object(
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    )
  );
  $$
);
